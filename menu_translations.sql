-- Set encoding
SET client_encoding = 'UTF8';

-- Update existing items
UPDATE menu_items SET name_en = 'Classic Burger',   name_ar = 'برغر كلاسيك',     name_ku = 'کلاسیک بەرگەر'   WHERE name ILIKE '%burger%';
UPDATE menu_items SET name_en = 'Grilled Chicken',  name_ar = 'دجاج مشوي',        name_ku = 'مریشکی بریان'     WHERE name ILIKE '%chicken%';
UPDATE menu_items SET name_en = 'Margherita Pizza', name_ar = 'بيتزا مارغريتا',   name_ku = 'پیتزا مارگەریتا'  WHERE name ILIKE '%pizza%';
UPDATE menu_items SET name_en = 'Caesar Salad',     name_ar = 'سلطة سيزر',        name_ku = 'سەلاتەی سیزەر'    WHERE name ILIKE '%salad%';
UPDATE menu_items SET name_en = 'Fresh Juice',      name_ar = 'عصير طازج',         name_ku = 'ئاوی مێوەی تازە'  WHERE name ILIKE '%juice%';
UPDATE menu_items SET name_en = 'Turkish Coffee',   name_ar = 'قهوة تركية',        name_ku = 'قاوەی تورکی'      WHERE name ILIKE '%coffee%';
UPDATE menu_items SET name_en = 'Chocolate Cake',   name_ar = 'كيك شوكولاتة',     name_ku = 'کێکی چکلێت'       WHERE name ILIKE '%cake%';

-- Insert new items
INSERT INTO menu_items (category_id, name, name_en, name_ar, name_ku, price, is_available) VALUES
(1, 'Kebab',            'Kebab',               'كباب',             'کەباب',             18000, true),
(1, 'Tikka',            'Tikka',               'تكة',              'تیکا',              22000, true),
(1, 'Shawarma',         'Shawarma',            'شاورما',           'شاوەرما',           15000, true),
(1, 'Grilled Fish',     'Grilled Fish',        'سمك مشوي',         'ماسی بریان',        25000, true),
(1, 'Masgouf',          'Masgouf',             'مسگوف',            'مەسگووف',           35000, true),
(1, 'Lamb Chops',       'Lamb Chops',          'ضلوع خروف',        'پەڵەی بەران',       30000, true),
(1, 'Dolma',            'Dolma',               'دولمة',            'دۆڵمە',             20000, true),
(1, 'Biryani Rice',     'Biryani Rice',        'رز برياني',        'برینجی بریانی',     22000, true),
(1, 'Kubba',            'Kubba',               'كبة',              'کوبە',              16000, true),
(1, 'Qeema',            'Qeema',               'قيمة',             'قیمە',              18000, true),
(2, 'Hummus',           'Hummus',              'حمص',              'حومموس',            8000,  true),
(2, 'Fattoush',         'Fattoush Salad',      'سلطة فتوش',        'سەلاتەی فەتووش',   7000,  true),
(2, 'Tabouleh',         'Tabouleh',            'تبولة',            'تابولە',            7000,  true),
(2, 'Lentil Soup',      'Lentil Soup',         'شوربة عدس',        'شۆربای مەرچ',       6000,  true),
(2, 'Bread Basket',     'Bread Basket',        'سلة خبز',          'سەبەتەی نان',       3000,  true),
(3, 'Doogh',            'Doogh',               'دوغ',              'دووخ',              5000,  true),
(3, 'Black Tea',        'Black Tea',           'شاي أسود',         'چای ڕەش',           3000,  true),
(3, 'Pomegranate Juice','Pomegranate Juice',   'عصير رمان',        'ئاوی هەنار',        7000,  true),
(3, 'Ayran',            'Ayran',               'أيران',            'ئایران',            4000,  true),
(3, 'Lemonade',         'Lemonade',            'ليموناضة',         'لیموناتە',          6000,  true),
(4, 'Baklava',          'Baklava',             'بقلاوة',           'بەقلاوە',           8000,  true),
(4, 'Kanafeh',          'Kanafeh',             'كنافة',            'کەنافە',            9000,  true),
(4, 'Rice Pudding',     'Rice Pudding',        'رز بالحليب',       'شیرمەنگ',          6000,  true),
(4, 'Halwa',            'Halwa',               'حلوى',             'حەلوا',             5000,  true)
ON CONFLICT DO NOTHING;
