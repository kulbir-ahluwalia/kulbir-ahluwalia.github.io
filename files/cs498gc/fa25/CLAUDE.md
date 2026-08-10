# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with files in this repository.

## Repository Overview

CS498GC Mobile Robotics Fall 2025 course materials directory. Contains all assignments, presentations, demo slides, and supplementary materials for the course website at https://kulbir-singh-ahluwalia.com/cs498gc/fa25/

## Directory Structure

```
files/cs498gc/fa25/
├── assignments/                              # Assignment PDFs and supporting materials
│   ├── assignment4-mobile-manipulator-gradescope-pdf/  # A4 Gradescope submission materials
│   │   └── images-frank-xu-nov12-dominick-braico-campuswire-pinned-posts-markdown/
│   ├── assignment4_extra_credit_guide.pdf    # (216K) Extra credit instructions
│   ├── extra_credit_submission_guide.pdf     # (231K) Submission guidelines
│   └── problem_set2.zip                      # (313K) Problem Set 2 materials
│
├── PDFs_assignments_demo_slides/              # Main course materials repository
│   ├── Assignment PDFs                       # Core assignment documents
│   ├── Demo Slides                          # Tutorial and demo presentations
│   ├── Student Presentations                 # Student SLAM presentations
│   └── Course Guides                        # Setup and best practices
│
└── presentations/                            # Additional presentation materials
    └── assignment4_part1_demo_main_VER1.16_PDF_ASSIGNMENT4.pdf
```

## File Inventory by Category

### Core Assignment Files (assignments/)
- `assignment4_extra_credit_guide.pdf` - 50-point extra credit options for RTAB-Map and SAMWISE
- `extra_credit_submission_guide.pdf` - Submission instructions for extra credit
- `problem_set2.zip` - Zipped problem set materials

### Assignment 4 Materials (9 images)
Located in `assignments/assignment4-mobile-manipulator-gradescope-pdf/`:
- `robotiq-1-Screenshot 2025-11-11 at 02.52.52.png` (1.6MB)
- `robotiq-2-Screenshot 2025-11-11 at 02.52.56.png` (1.3MB)
- `robotiq-3-Screenshot 2025-11-11 at 02.53.10.png` (5.4MB) ⚠️ Large file
- `robotiq-4-Screenshot 2025-11-11 at 02.53.34.png` (406K)
- `robotiq-5-Screenshot 2025-11-11 at 02.53.48.png` (439K)
- `robotiq-6-Screenshot 2025-11-11 at 03.14.48.png` (73K)
- `robotiq-7-Screenshot 2025-11-11 at 03.15.10.png` (88K)
- `robotiq-8-Screenshot 2025-11-11 at 02.53.57.png` (437K)
- `robotiq-9-Screenshot 2025-11-11 at 03.23.42.png` (426K)

### Course Presentations & Tutorials (PDFs_assignments_demo_slides/)

#### ROS2 Tutorials
- `ros2_tutorial_1.pdf` (280K) - Basic ROS2 concepts
- `ros2_tutorial_2.pdf` (280K) - Advanced topics

#### Assignment Materials
- `assignment4_part1_demo_main_VER1.16_PDF_ASSIGNMENT4.pdf` (398K)
- `assignment4_extra_credit_guide.pdf` (216K)
- `extra_credit_submission_guide.pdf` (231K)

#### Student Presentations (SLAM)
- `CS498GC: Student Presentations.pdf` (112K)
- `GRADESCOPE - CS498GC: Student Presentations.pdf` (125K)
- `NOV21-CS498GC-SLAM-PPT-LINK - Copy-1.pdf` (25MB) ⚠️ Large file - Git LFS
- `NOV22 - UPDATED - SLAM USING MOBILE MANIPULATOR USING ROS-2 - Nov 14 Copy.pdf` (6.8MB) ⚠️ Large file - Git LFS
- `SLAM USING MOBILE MANIPULATOR USING ROS-2 - Nov 14 Copy.pptx` (28MB) ⚠️ Large file - Git LFS

#### Course Guides
- `claude_best_practices_guide.pdf` (234K) - AI assistant usage guidelines
- `quiz_submission_guide.pdf` (199K) - Quiz format and submission
- `hidden_curriculum.pdf` (86K) - Additional tips and tricks

### LaTeX Source Files
- `assignment4_part2_must3r_rubric.tex` (7.5K)
- `assignment4_part2_must3r_rubric_v2.tex` (8.0K)
- `assignment4_part2_must3r_rubric_v3.tex` (16K)

### Generated Documents
- `assignment4_part2_must3r_rubric_v3.md` (14K)
- `assignment4_part2_rubric.md` (7.2K)

## Git LFS Configuration

Large files (>5MB) are tracked using Git LFS:

```bash
# Tracked patterns
*.pdf (files > 5MB)
*.pptx (all PowerPoint files)

# Large files requiring LFS (>5MB)
- robotiq-3-Screenshot 2025-11-11 at 02.53.10.png (5.4MB)
- NOV21-CS498GC-SLAM-PPT-LINK - Copy-1.pdf (25MB)
- NOV22 - UPDATED - SLAM USING MOBILE MANIPULATOR USING ROS-2 - Nov 14 Copy.pdf (6.8MB)
- SLAM USING MOBILE MANIPULATOR USING ROS-2 - Nov 14 Copy.pptx (28MB)
```

## File Naming Conventions

### Assignment Files
- Format: `assignment[#]_[part]_[description]_[version].pdf`
- Example: `assignment4_part1_demo_main_VER1.16_PDF_ASSIGNMENT4.pdf`

### Student Presentations
- Format: `[DATE]-CS498GC-[TOPIC]-[ADDITIONAL_INFO].pdf`
- Example: `NOV21-CS498GC-SLAM-PPT-LINK - Copy-1.pdf`

### Tutorial Files
- Format: `[tool]_tutorial_[number].pdf`
- Example: `ros2_tutorial_1.pdf`

## Update Procedures

### Adding New Files
1. Place files in appropriate subdirectory
2. Check file size: `ls -lh filename`
3. If >5MB, ensure Git LFS is tracking: `git lfs track "*.extension"`
4. Stage files: `git add filename`
5. Commit with descriptive message: `git commit -m "Fall 2025: Add [description]"`
6. Push to GitHub: `git push origin main`

### Updating Existing Files
1. Replace file in appropriate directory
2. Increment version number if applicable (e.g., VER1.16 → VER1.17)
3. Update this CLAUDE.md if structure changes
4. Commit with change description

## Quick Reference

### Most Accessed Files
- **Assignment 4 Part 1**: `assignment4_part1_demo_main_VER1.16_PDF_ASSIGNMENT4.pdf`
- **Extra Credit Guide**: `assignment4_extra_credit_guide.pdf`
- **Student Presentations**: `CS498GC: Student Presentations.pdf`
- **ROS2 Tutorials**: `ros2_tutorial_1.pdf`, `ros2_tutorial_2.pdf`

### File Size Limits
- **Direct Git**: Files < 5MB
- **Git LFS Required**: Files > 5MB
- **GitHub Limit**: 100MB per file (without LFS)
- **Repository Total**: No hard limit with LFS

## Branch Synchronization

This directory should be synchronized across branches:
- `main` - Production branch
- `macbook_m3__cs498gc_fa2025_ubuntu24` - macOS development
- `nvidia-dgx-sparks-kulbir-cs498gc` - NVIDIA DGX testing
- `msi_raider_csd498gc_fa2025_ubuntu24` - MSI laptop development

### Sync Command
```bash
# Push to all branches
for branch in main macbook_m3__cs498gc_fa2025_ubuntu24 nvidia-dgx-sparks-kulbir-cs498gc msi_raider_csd498gc_fa2025_ubuntu24; do
    git checkout $branch
    git merge main
    git push origin $branch
done
```

## Maintenance Notes

- **File Count**: 32 files total (including hidden .DS_Store files)
- **Total Size**: ~75MB (with large files)
- **Last Updated**: November 22, 2025
- **Course URL**: https://kulbir-singh-ahluwalia.com/cs498gc/fa25/

## Common Operations

### Check for Untracked Files
```bash
git status --porcelain | grep "^??"
```

### Find Large Files
```bash
find . -type f -size +5M -exec ls -lh {} \;
```

### Verify LFS Tracking
```bash
git lfs ls-files
```

### Clean macOS Metadata
```bash
find . -name ".DS_Store" -delete
```