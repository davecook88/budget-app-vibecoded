INSERT INTO public.categories (name, icon, color, type, is_system)
SELECT v.name, v.icon, v.color, v.type, v.is_system
FROM (
  VALUES
    ('Food & Dining', 'utensils', '#ef4444', 'expense', true),
    ('Transportation', 'car', '#f97316', 'expense', true),
    ('Shopping', 'shopping-bag', '#eab308', 'expense', true),
    ('Entertainment', 'film', '#22c55e', 'expense', true),
    ('Bills & Utilities', 'zap', '#06b6d4', 'expense', true),
    ('Health', 'heart', '#ec4899', 'expense', true),
    ('Travel', 'plane', '#8b5cf6', 'expense', true),
    ('Education', 'book', '#6366f1', 'expense', true),
    ('Personal Care', 'smile', '#14b8a6', 'expense', true),
    ('Groceries', 'shopping-cart', '#84cc16', 'expense', true),
    ('Fun Money', 'gamepad-2', '#f472b6', 'expense', true),
    ('Home', 'home', '#a855f7', 'expense', true),
    ('Salary', 'briefcase', '#10b981', 'income', true),
    ('Freelance', 'laptop', '#3b82f6', 'income', true),
    ('Investments', 'trending-up', '#6366f1', 'income', true),
    ('Other Income', 'plus-circle', '#8b5cf6', 'income', true)
) AS v(name, icon, color, type, is_system)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE is_system = true
);
