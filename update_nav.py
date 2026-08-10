#!/usr/bin/env python3
import re
import os

# List of HTML files to update (excluding slaming_mars.html)
html_files = [
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/index.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/logistics.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/syllabus.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/mars_gazebo_tutorial.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/announcements.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/resources.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/presentations.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/gallery.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/mobile_manipulator_project.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/policies.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/setup.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/extra_credit.html",
    "/Users/kulbir/Desktop/CS498GC_MobileRobotics_Fall2025/kulbir-ahluwalia.github.io/cs498gc/fa25/assignments.html"
]

def update_navigation(file_path):
    """Update navigation in HTML file to replace Mars Project and Mars SLAM with single SLAM-ing Mars link"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the navigation section
    # Pattern to match the nav items for Mars Project and Mars SLAM
    pattern1 = r'<li class="nav-item[^"]*">\s*<a class="nav-link[^"]*" href="mobile_manipulator_project.html">[^<]*</a>\s*</li>'
    pattern2 = r'<li class="nav-item[^"]*">\s*<a class="nav-link[^"]*" href="mars_gazebo_tutorial.html">[^<]*</a>\s*</li>'

    # First, check if both old links exist
    has_mars_project = re.search(pattern1, content)
    has_mars_slam = re.search(pattern2, content)

    if has_mars_project or has_mars_slam:
        # Remove the Mars Project link
        content = re.sub(pattern1, '', content)

        # Replace the Mars SLAM link with the new SLAM-ing Mars link
        replacement = '<li class="nav-item">\n                        <a class="nav-link" href="slaming_mars.html">🚀 SLAM-ing Mars 🔴</a>\n                    </li>'
        content = re.sub(pattern2, replacement, content)

        # If only Mars Project exists but not Mars SLAM, add the new link after presentations
        if has_mars_project and not has_mars_slam:
            presentations_pattern = r'(<li class="nav-item[^"]*">\s*<a class="nav-link[^"]*" href="presentations.html">[^<]*</a>\s*</li>)'
            content = re.sub(presentations_pattern, r'\1\n                    <li class="nav-item">\n                        <a class="nav-link" href="slaming_mars.html">🚀 SLAM-ing Mars 🔴</a>\n                    </li>', content)

    # Save the updated content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Updated: {os.path.basename(file_path)}")

# Update all HTML files
for file_path in html_files:
    if os.path.exists(file_path):
        update_navigation(file_path)
    else:
        print(f"File not found: {file_path}")

print("Navigation update complete!")