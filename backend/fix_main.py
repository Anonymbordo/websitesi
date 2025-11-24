# Read file
with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line numbers
import_insert_line = None
router_insert_line = None

for i, line in enumerate(lines):
    if 'from course_boxes import course_boxes_router' in line:
        # Find the end of this try-except block (5 lines after)
        import_insert_line = i + 5
    if 'app.include_router(course_boxes_router' in line:
        router_insert_line = i + 1

if import_insert_line is None or router_insert_line is None:
    print("❌ Could not find insertion points")
    exit(1)

# Prepare new imports
new_imports = [
    '\n',
    'try:\n',
    '    from course_box_content import router as course_box_content_router\n',
    'except Exception as e:\n',
    '    print(f"❌ Error importing course_box_content_router: {e}")\n',
    '    course_box_content_router = None\n',
    '\n',
    'try:\n',
    '    from course_box_pricing import router as course_box_pricing_router\n',
    'except Exception as e:\n',
    '    print(f"❌ Error importing course_box_pricing_router: {e}")\n',
    '    course_box_pricing_router = None\n',
    '\n',
    'try:\n',
    '    from course_box_quiz import router as course_box_quiz_router\n',
    'except Exception as e:\n',
    '    print(f"❌ Error importing course_box_quiz_router: {e}")\n',
    '    course_box_quiz_router = None\n',
]

# Prepare new router registrations
new_routers = [
    'if course_box_content_router:\n',
    '    app.include_router(course_box_content_router, prefix="/api", tags=["Course Box Content"])\n',
    'if course_box_pricing_router:\n',
    '    app.include_router(course_box_pricing_router, prefix="/api", tags=["Course Box Pricing"])\n',
    'if course_box_quiz_router:\n',
    '    app.include_router(course_box_quiz_router, prefix="/api", tags=["Course Box Quiz"])\n',
    '\n',
]

# Insert imports
lines = lines[:import_insert_line] + new_imports + lines[import_insert_line:]

# Adjust router insert line (it shifted due to imports)
router_insert_line += len(new_imports)

# Insert router registrations
lines = lines[:router_insert_line] + new_routers + lines[router_insert_line:]

# Write back
with open('main.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"✅ Imports inserted at line {import_insert_line}")
print(f"✅ Routers inserted at line {router_insert_line}")
print("✅ main.py updated successfully!")
