# Assignment 4 Part 2: Mobile Manipulation with SLAM

## Overview

Building upon your successful Part 1 mobile manipulator implementation, Part 2 challenges you to implement SLAM (Simultaneous Localization and Mapping) capabilities inspired by state-of-the-art research like MASt3R-SLAM.

## Due Date

**December 9, 2025 @ 11:00 PM** (75 points)

## Learning Objectives

- Implement sensor fusion using Extended Kalman Filter (EKF)
- Develop path planning and control algorithms for mobile manipulation
- Create 2D SLAM capability using laser scanner data
- Integrate perception, planning, and control in a unified system
- Document technical implementation following research paper standards

## Requirements

### 1. Sensor Fusion (15 points)

Implement an Extended Kalman Filter (EKF) for sensor fusion:

- **State Estimation**: Fuse odometry, IMU, and GPS data
- **Covariance Management**: Properly handle measurement and process noise
- **Update Rate**: Maintain real-time performance (≥10 Hz)
- **Deliverable**: EKF node publishing to `/robot_pose` topic

### 2. Path Planning & Control (15 points)

Develop navigation capabilities for your mobile manipulator:

- **Global Planner**: Implement A* or RRT* for path planning
- **Local Planner**: Dynamic Window Approach (DWA) or TEB planner
- **Obstacle Avoidance**: Use laser scanner for dynamic obstacles
- **Deliverable**: Navigation stack that accepts goal poses and executes paths

### 3. SLAM Implementation (10 points)

Create 2D mapping capability with simultaneous localization:

- **Mapping Algorithm**: Implement gmapping or hector_slam
- **Map Resolution**: Minimum 0.05m resolution
- **Loop Closure**: Basic loop closure detection
- **Deliverable**: Occupancy grid map saved as `.pgm` file

### 4. Integration Demo (25 points)

Complete integrated demonstration showing:

- Robot starting from unknown location
- Autonomous exploration and mapping
- Object manipulation during exploration
- Return to starting position using created map
- **Deliverable**: ROSbag recording (minimum 5 minutes)

### 5. Mars Environment Bonus (+10 points)

Complete all tasks in the Mars environment:

- Navigate Mars terrain with reduced traction
- Handle Mars-specific obstacles (rocks, craters)
- Complete race track challenge
- **Deliverable**: Separate Mars ROSbag recording

### 6. Technical Report (10 points)

RSS format technical report (8-10 pages) including:

- **Abstract**: 150-200 words
- **Introduction**: Problem statement and motivation
- **Related Work**: Reference to MASt3R-SLAM and other approaches
- **Methodology**: Your implementation details
- **Results**: Quantitative metrics and qualitative analysis
- **Conclusion**: Lessons learned and future work

**Template**: [RSS Paper Format](https://roboticsconference.org/2019/12/04/paper-format/)

## Reference Implementation: MASt3R-SLAM

Your implementation should be inspired by (but not necessarily replicate):

**MASt3R-SLAM: Real-Time Dense SLAM with 3D Reconstruction Priors**
- **Paper**: [https://edexheim.github.io/mast3r-slam/](https://edexheim.github.io/mast3r-slam/)
- **GitHub**: [https://github.com/naver/mast3r](https://github.com/naver/mast3r) (foundation model)
- **Conference**: CVPR 2025

Key concepts to consider:
- Dense reconstruction using learned priors
- Real-time performance optimization
- Robust tracking in challenging environments

## Environment Setup

### Standard World

Use your Part 1 setup with additional sensors:
- Laser scanner for mapping
- IMU for orientation estimation
- GPS for global localization (optional)

### Mars World (Optional Bonus)

Follow the [Mars Gazebo Tutorial](mars_gazebo_tutorial.md) for:
- Mars terrain setup
- Modified physics parameters
- NASA/JPL texture resources
- Race track challenge

## Submission Requirements

Submit to Gradescope by **December 9, 2025 @ 11:00 PM**:

1. **Source Code** (30 points)
   - EKF implementation
   - Path planning nodes
   - SLAM configuration files
   - Launch files

2. **ROSbag Recordings** (25 points)
   - Standard world demo (5+ minutes)
   - Mars world demo (if attempting bonus)
   - Include all sensor topics

3. **Technical Report** (10 points)
   - PDF in RSS format
   - 8-10 pages including references
   - Figures and results

4. **Video Demo** (10 points)
   - 3-5 minute edited video
   - Show key capabilities
   - Upload to YouTube (unlisted)

## Evaluation Criteria

### Performance Metrics

- **Localization Accuracy**: < 0.5m RMSE
- **Mapping Quality**: Clear obstacle boundaries
- **Path Following**: < 0.3m cross-track error
- **Manipulation Success**: 80% grasp success rate
- **Real-time Performance**: Maintain 10 Hz control loop

### Code Quality

- Clear documentation and comments
- Modular design with ROS2 best practices
- Proper error handling
- Git commit history showing progress

## Resources

### Tutorials

- [ROS2 Control Tutorial](https://automaticaddison.com/how-to-control-a-robotic-arm-using-ros-2-control-and-gazebo/)
- [Nav2 Documentation](https://navigation.ros.org/)
- [slam_toolbox](https://github.com/SteveMacenski/slam_toolbox)

### Office Hours

- **Regular**: Wednesday 1:30-2:30 PM @ SC 4407
- **Special SLAM Sessions**: Dec 2, 4, 6 @ 3:00 PM
- **Campuswire**: 24/7 for questions

### Example Code

Starter code available at:
```bash
git clone https://github.com/kulbir-ahluwalia/cs498gc_assignment4_part2
```

## Common Issues & Solutions

### Issue: EKF Diverging

**Solution**: Check covariance matrices initialization:
```python
self.P = np.eye(6) * 0.01  # Small initial uncertainty
self.Q = np.diag([0.1, 0.1, 0.01, 0.01, 0.01, 0.001])  # Process noise
self.R = np.diag([0.5, 0.5, 0.1])  # Measurement noise
```

### Issue: SLAM Not Creating Map

**Solution**: Verify laser scanner configuration:
```yaml
# In your launch file
scan_topic: /scan
map_frame: map
odom_frame: odom
base_frame: base_link
```

### Issue: Path Planner Failing

**Solution**: Check costmap configuration:
```yaml
global_costmap:
  robot_radius: 0.5
  inflation_radius: 0.8
  obstacle_range: 2.5
  raytrace_range: 3.0
```

## Academic Integrity

- You may discuss approaches with classmates
- Code must be your own implementation
- Cite any external resources used
- Do not copy from MASt3R-SLAM implementation

## Late Policy

- -10% per day late
- Maximum 3 days late accepted
- After 3 days: 0 points

## Questions?

- **Campuswire**: Post with tag `#assignment4-part2`
- **Email**: ksa5@illinois.edu
- **Office Hours**: See schedule above

---

*Good luck with your SLAM implementation! Remember: Start early, test often, and don't hesitate to ask for help.*