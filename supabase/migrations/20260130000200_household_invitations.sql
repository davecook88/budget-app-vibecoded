-- Household invitations table for code-based invites
CREATE TABLE IF NOT EXISTS "public"."household_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "used_by" "uuid",
    CONSTRAINT "household_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "household_invitations_code_key" UNIQUE ("code"),
    CONSTRAINT "household_invitations_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE,
    CONSTRAINT "household_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "household_invitations_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."household_invitations" OWNER TO "postgres";

CREATE INDEX "idx_household_invitations_code" ON "public"."household_invitations" USING "btree" ("code");
CREATE INDEX "idx_household_invitations_household" ON "public"."household_invitations" USING "btree" ("household_id");

-- RLS policies for household_invitations
ALTER TABLE "public"."household_invitations" ENABLE ROW LEVEL SECURITY;

-- Users can view invitations for households they're in
CREATE POLICY "Users can view their household invitations"
    ON "public"."household_invitations"
    FOR SELECT
    USING (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can create invitations for their household
CREATE POLICY "Users can create invitations for their household"
    ON "public"."household_invitations"
    FOR INSERT
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Anyone can view unexpired, unused invitations by code (for accepting)
CREATE POLICY "Anyone can view valid invitation by code"
    ON "public"."household_invitations"
    FOR SELECT
    USING (
        used_at IS NULL
        AND expires_at > now()
    );

-- Users can update (mark as used) invitations they're accepting
CREATE POLICY "Users can mark invitation as used"
    ON "public"."household_invitations"
    FOR UPDATE
    USING (
        used_at IS NULL
        AND expires_at > now()
    )
    WITH CHECK (
        used_by = auth.uid()
        AND used_at IS NOT NULL
    );

-- Function to create a household for the current user
CREATE OR REPLACE FUNCTION "public"."create_household"("p_name" "text")
RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  v_household_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user already has a household
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id AND household_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to a household';
  END IF;
  
  -- Create the household
  INSERT INTO households (name)
  VALUES (p_name)
  RETURNING id INTO v_household_id;
  
  -- Update user's household_id
  UPDATE users
  SET household_id = v_household_id
  WHERE id = v_user_id;
  
  RETURN v_household_id;
END;
$$;

-- Function to generate a household invitation
CREATE OR REPLACE FUNCTION "public"."create_household_invitation"()
RETURNS TABLE (code "text", expires_at timestamp with time zone)
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_household_id UUID;
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's household
  SELECT household_id INTO v_household_id
  FROM users
  WHERE id = v_user_id;
  
  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a household';
  END IF;
  
  -- Generate a secure random code
  v_code := encode(gen_random_bytes(16), 'base64');
  v_code := replace(replace(replace(v_code, '+', ''), '/', ''), '=', '');
  
  -- Set expiration to 7 days from now
  v_expires_at := now() + interval '7 days';
  
  -- Insert invitation
  INSERT INTO household_invitations (household_id, code, created_by, expires_at)
  VALUES (v_household_id, v_code, v_user_id, v_expires_at);
  
  RETURN QUERY SELECT v_code, v_expires_at;
END;
$$;

-- Function to accept a household invitation
CREATE OR REPLACE FUNCTION "public"."accept_household_invitation"("p_code" "text")
RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_household_id UUID;
  v_invitation_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user already has a household
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id AND household_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to a household';
  END IF;
  
  -- Find valid invitation
  SELECT id, household_id INTO v_invitation_id, v_household_id
  FROM household_invitations
  WHERE code = p_code
    AND used_at IS NULL
    AND expires_at > now();
  
  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;
  
  -- Mark invitation as used
  UPDATE household_invitations
  SET used_at = now(),
      used_by = v_user_id
  WHERE id = v_invitation_id;
  
  -- Update user's household_id
  UPDATE users
  SET household_id = v_household_id
  WHERE id = v_user_id;
  
  RETURN v_household_id;
END;
$$;

-- Function to leave household
CREATE OR REPLACE FUNCTION "public"."leave_household"()
RETURNS void
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_household_id UUID;
  v_member_count INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's household
  SELECT household_id INTO v_household_id
  FROM users
  WHERE id = v_user_id;
  
  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'User is not in a household';
  END IF;
  
  -- Remove user from household
  UPDATE users
  SET household_id = NULL
  WHERE id = v_user_id;
  
  -- Check if household is now empty
  SELECT COUNT(*) INTO v_member_count
  FROM users
  WHERE household_id = v_household_id;
  
  -- Delete household if empty
  IF v_member_count = 0 THEN
    DELETE FROM households WHERE id = v_household_id;
  END IF;
END;
$$;
