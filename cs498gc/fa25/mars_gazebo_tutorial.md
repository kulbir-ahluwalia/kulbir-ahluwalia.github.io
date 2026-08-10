# Mars Gazebo Worlds - Technical Tutorial
## CS498GC Mobile Robotics - Fall 2025
### Complete Setup Guide for Mars Exploration with Husky + UR3

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installing Mars Terrain Packages](#installing-mars-terrain-packages)
3. [NASA/JPL Resources Integration](#nasajpl-resources-integration)
4. [Creating Custom Mars Worlds](#creating-custom-mars-worlds)
5. [Robot Configuration for Mars](#robot-configuration-for-mars)
6. [Launch File Configuration](#launch-file-configuration)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Features](#advanced-features)

---

## Prerequisites

### System Requirements
- **OS**: Ubuntu 24.04 (Jazzy) or Ubuntu 22.04 (Humble)
- **ROS2**: Jazzy or Humble
- **Gazebo**: Harmonic (recommended) or Fortress
- **GPU**: Recommended for complex terrain rendering
- **RAM**: Minimum 8GB, 16GB recommended
- **Storage**: 10GB for terrain data and textures

### Required Packages
```bash
# ROS2 Gazebo packages
sudo apt-get update
sudo apt-get install ros-${ROS_DISTRO}-gazebo-ros-pkgs
sudo apt-get install ros-${ROS_DISTRO}-gazebo-msgs
sudo apt-get install ros-${ROS_DISTRO}-gazebo-plugins

# Visualization and terrain tools
sudo apt-get install ros-${ROS_DISTRO}-rviz2
sudo apt-get install python3-pcl
sudo apt-get install libgdal-dev

# Performance monitoring
sudo apt-get install htop nvidia-smi
```

---

## Installing Mars Terrain Packages

### Step 1: Clone Mars Terrain Repository
```bash
# Navigate to your ROS2 workspace
cd ~/ros2_ws/src

# Clone the Mars terrain packages
git clone https://github.com/nasa-jpl/mars_gazebo_terrains.git
git clone https://github.com/ros-simulation/gazebo_ros_demos.git

# Clone NASA Mars assets
git clone https://github.com/nasa/mars-rover-simulation.git
```

### Step 2: Download High-Resolution Terrain Data
```bash
cd ~/ros2_ws/src/mars_gazebo_terrains

# Download Jezero Crater terrain mesh (2GB)
wget https://nasa-mars-data.s3.amazonaws.com/terrain/jezero_crater_mesh.dae
wget https://nasa-mars-data.s3.amazonaws.com/terrain/jezero_crater_heightmap.tif

# Download Olympus Mons terrain
wget https://nasa-mars-data.s3.amazonaws.com/terrain/olympus_mons_mesh.dae

# Download texture packs
./scripts/download_mars_textures.sh

# Verify downloads
ls -lh meshes/
ls -lh textures/
```

### Step 3: Build Mars Packages
```bash
cd ~/ros2_ws

# Build with optimizations
colcon build --packages-select mars_gazebo_terrains \
  --cmake-args -DCMAKE_BUILD_TYPE=Release

# Source the workspace
source install/setup.bash

# Verify installation
ros2 pkg list | grep mars
```

---

## NASA/JPL Resources Integration

### Mars Orbital Data Integration
```bash
# Install GDAL tools for processing NASA elevation data
pip3 install gdal rasterio

# Convert NASA HiRISE DTM to Gazebo heightmap
python3 scripts/convert_dtm_to_heightmap.py \
  --input nasa_data/ESP_037222_1985_DTM.tif \
  --output models/mars_terrain/heightmap.png \
  --scale 0.1
```

### Mars Sky and Lighting Configuration
```xml
<!-- mars_sky.sdf -->
<sdf version="1.6">
  <world name="mars_environment">
    <!-- Mars atmosphere color -->
    <scene>
      <ambient>0.4 0.3 0.2 1</ambient>
      <background>0.7 0.4 0.3 1</background>
      <sky>
        <sunset>18</sunset>
        <sunrise>6</sunrise>
        <clouds>
          <speed>12</speed>
          <humidity>0.1</humidity>
        </clouds>
      </sky>
    </scene>

    <!-- Mars gravity (3.71 m/s²) -->
    <physics type="ode">
      <gravity>0 0 -3.71</gravity>
      <max_step_size>0.001</max_step_size>
      <real_time_factor>1.0</real_time_factor>
    </physics>

    <!-- Reduced sunlight intensity -->
    <light name="sun" type="directional">
      <cast_shadows>true</cast_shadows>
      <pose>0 0 10 0 0 0</pose>
      <diffuse>0.8 0.6 0.5 1</diffuse>
      <specular>0.5 0.4 0.3 1</specular>
      <attenuation>
        <range>1000</range>
        <constant>0.9</constant>
        <linear>0.01</linear>
      </attenuation>
    </light>
  </world>
</sdf>
```

---

## Creating Custom Mars Worlds

### Basic Mars World Template
```xml
<?xml version="1.0"?>
<sdf version="1.6">
  <world name="mars_exploration">

    <!-- Include Mars environment settings -->
    <include>
      <uri>model://mars_sky</uri>
    </include>

    <!-- Jezero Crater terrain -->
    <include>
      <uri>model://jezero_crater_terrain</uri>
      <pose>0 0 0 0 0 0</pose>
      <static>true</static>
    </include>

    <!-- Mars rocks and obstacles -->
    <include>
      <uri>model://mars_rock_large</uri>
      <pose>10 5 0.5 0 0 0</pose>
      <name>rock_01</name>
    </include>

    <include>
      <uri>model://mars_rock_medium</uri>
      <pose>-5 8 0.3 0 0 1.57</pose>
      <name>rock_02</name>
    </include>

    <!-- Sample collection targets -->
    <include>
      <uri>model://mars_sample_container</uri>
      <pose>15 10 0.2 0 0 0</pose>
      <name>sample_target_01</name>
    </include>

    <!-- Mars base station (optional) -->
    <include>
      <uri>model://mars_habitat</uri>
      <pose>-20 -20 0 0 0 0</pose>
      <name>base_station</name>
    </include>

    <!-- Dust storm particle system -->
    <include>
      <uri>model://dust_storm_system</uri>
      <pose>0 0 20 0 0 0</pose>
    </include>

  </world>
</sdf>
```

### Advanced Terrain Generation Script
```python
#!/usr/bin/env python3
"""
generate_mars_terrain.py
Generate procedural Mars terrain with craters and rocks
"""

import numpy as np
from noise import snoise2
import cv2
import rclpy
from rclpy.node import Node

class MarsTerrainGenerator(Node):
    def __init__(self):
        super().__init__('mars_terrain_generator')
        self.declare_parameter('width', 1024)
        self.declare_parameter('height', 1024)
        self.declare_parameter('scale', 100.0)
        self.declare_parameter('octaves', 6)
        self.declare_parameter('crater_density', 0.1)

    def generate_heightmap(self):
        width = self.get_parameter('width').value
        height = self.get_parameter('height').value
        scale = self.get_parameter('scale').value
        octaves = self.get_parameter('octaves').value

        heightmap = np.zeros((height, width))

        # Generate base terrain using Perlin noise
        for y in range(height):
            for x in range(width):
                heightmap[y][x] = snoise2(
                    x / scale,
                    y / scale,
                    octaves=octaves,
                    persistence=0.5,
                    lacunarity=2.0,
                    base=0
                )

        # Add craters
        num_craters = int(width * height *
                          self.get_parameter('crater_density').value / 10000)

        for _ in range(num_craters):
            cx = np.random.randint(0, width)
            cy = np.random.randint(0, height)
            radius = np.random.randint(5, 50)
            depth = np.random.uniform(0.1, 0.5)

            # Create crater depression
            y, x = np.ogrid[-cy:height-cy, -cx:width-cx]
            mask = x**2 + y**2 <= radius**2
            heightmap[mask] -= depth

        # Normalize to 0-255 range
        heightmap = ((heightmap - heightmap.min()) /
                     (heightmap.max() - heightmap.min()) * 255).astype(np.uint8)

        return heightmap

    def save_heightmap(self, heightmap, filename='mars_heightmap.png'):
        cv2.imwrite(filename, heightmap)
        self.get_logger().info(f'Saved heightmap to {filename}')

def main(args=None):
    rclpy.init(args=args)
    generator = MarsTerrainGenerator()
    heightmap = generator.generate_heightmap()
    generator.save_heightmap(heightmap)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

---

## Robot Configuration for Mars

### Husky + UR3 Mars Configuration
```yaml
# config/husky_ur3_mars.yaml
husky_ur3_mars:
  ros__parameters:
    # Adjust for Mars gravity
    gravity_compensation: 3.71

    # Wheel parameters for soft terrain
    wheel_separation: 0.555
    wheel_radius: 0.177
    wheel_slip_compensation: 0.15  # Account for sand/dust

    # Reduced speeds for rough terrain
    max_linear_velocity: 0.5  # m/s
    max_angular_velocity: 1.0  # rad/s

    # UR3 arm adjustments
    arm:
      joint_limits:
        - shoulder_pan: [-3.14, 3.14]
        - shoulder_lift: [-3.14, 0]
        - elbow: [-3.14, 3.14]
      max_velocity: 0.5  # Slower for stability

    # Gripper settings for sample collection
    gripper:
      max_opening: 0.085  # meters
      grip_force: 20.0  # Newtons

    # Sensor configuration
    sensors:
      lidar:
        range_max: 30.0
        range_min: 0.1
        update_rate: 10.0
      imu:
        update_rate: 100.0
        noise_stddev: 0.01
      cameras:
        resolution: [1920, 1080]
        fps: 30
        fov: 90  # degrees
```

---

## Launch File Configuration

### Complete Mars Mission Launch File
```python
# launch/mars_exploration_mission.launch.py
import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

def generate_launch_description():
    # Package directories
    mars_pkg = get_package_share_directory('mars_gazebo_terrains')
    husky_pkg = get_package_share_directory('husky_ur3_simulation')

    # Launch arguments
    world_name = LaunchConfiguration('world', default='jezero_crater')
    use_sim_time = LaunchConfiguration('use_sim_time', default='true')
    robot_name = LaunchConfiguration('robot_name', default='husky_ur3')

    # World file path
    world_file = os.path.join(
        mars_pkg, 'worlds',
        LaunchConfiguration('world').perform(context) + '.world'
    )

    return LaunchDescription([
        # Declare arguments
        DeclareLaunchArgument(
            'world',
            default_value='jezero_crater',
            description='Mars world to load'
        ),

        DeclareLaunchArgument(
            'use_sim_time',
            default_value='true',
            description='Use simulation time'
        ),

        # Launch Gazebo with Mars world
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource([
                os.path.join(get_package_share_directory('gazebo_ros'),
                            'launch', 'gazebo.launch.py')
            ]),
            launch_arguments={
                'world': world_file,
                'verbose': 'true',
                'physics': 'ode',
                'extra_gazebo_args': '--ros-args --params-file ' +
                    os.path.join(mars_pkg, 'config', 'gazebo_mars.yaml')
            }.items()
        ),

        # Spawn Husky + UR3 robot
        Node(
            package='gazebo_ros',
            executable='spawn_entity.py',
            arguments=[
                '-entity', robot_name,
                '-topic', 'robot_description',
                '-x', '0.0',
                '-y', '0.0',
                '-z', '1.0',  # Spawn above terrain
                '-Y', '0.0'
            ],
            output='screen'
        ),

        # Robot state publisher
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            parameters=[{
                'use_sim_time': use_sim_time,
                'robot_description': Command([
                    'xacro ', os.path.join(husky_pkg, 'urdf',
                    'husky_ur3_mars.urdf.xacro')
                ])
            }]
        ),

        # Controllers
        Node(
            package='controller_manager',
            executable='ros2_control_node',
            parameters=[
                os.path.join(husky_pkg, 'config',
                            'husky_ur3_mars_controllers.yaml'),
                {'use_sim_time': use_sim_time}
            ]
        ),

        # Navigation stack for Mars
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource([
                os.path.join(get_package_share_directory('nav2_bringup'),
                            'launch', 'navigation_launch.py')
            ]),
            launch_arguments={
                'use_sim_time': 'true',
                'params_file': os.path.join(mars_pkg, 'config',
                                           'mars_nav_params.yaml')
            }.items()
        ),

        # MoveIt2 for manipulation
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource([
                os.path.join(get_package_share_directory('husky_ur3_moveit'),
                            'launch', 'move_group.launch.py')
            ]),
            launch_arguments={'use_sim_time': 'true'}.items()
        ),

        # Mars mission controller
        Node(
            package='mars_mission_controller',
            executable='mission_executor',
            parameters=[{
                'use_sim_time': use_sim_time,
                'mission_config': os.path.join(mars_pkg, 'missions',
                                              'sample_collection.yaml')
            }],
            output='screen'
        ),

        # RViz2 with Mars visualization config
        Node(
            package='rviz2',
            executable='rviz2',
            arguments=['-d', os.path.join(mars_pkg, 'rviz',
                                         'mars_exploration.rviz')],
            parameters=[{'use_sim_time': use_sim_time}]
        ),
    ])
```

---

## Performance Optimization

### GPU Acceleration
```bash
# Enable GPU acceleration for Gazebo
export GAZEBO_GPU_ACCELERATED=1
export LIBGL_ALWAYS_SOFTWARE=0  # Disable for physical machines

# For NVIDIA GPUs
export __NV_PRIME_RENDER_OFFLOAD=1
export __GLX_VENDOR_LIBRARY_NAME=nvidia

# Monitor GPU usage
nvidia-smi -l 1
```

### Terrain LOD (Level of Detail) Configuration
```xml
<!-- models/mars_terrain/model.config -->
<model>
  <static>true</static>
  <link name="terrain_link">
    <visual name="terrain_visual">
      <geometry>
        <heightmap>
          <uri>file://heightmaps/mars_terrain.png</uri>
          <size>500 500 50</size>
          <pos>0 0 0</pos>
          <texture>
            <size>10</size>
            <diffuse>file://textures/mars_surface.jpg</diffuse>
            <normal>file://textures/mars_normal.jpg</normal>
          </texture>
          <!-- LOD settings for performance -->
          <lod>
            <min_distance>0</min_distance>
            <max_distance>50</max_distance>
            <min_pixel_size>100</min_pixel_size>
          </lod>
        </heightmap>
      </geometry>
    </visual>
  </link>
</model>
```

### Physics Engine Tuning
```yaml
# config/gazebo_mars_physics.yaml
physics:
  type: ode
  max_step_size: 0.002  # 500Hz update
  real_time_factor: 1.0
  real_time_update_rate: 500.0

  ode:
    solver_type: quick
    min_step_size: 0.0001
    iters: 50
    sor: 1.3
    use_dynamic_moi_rescaling: false

  # Contact parameters for soft terrain
  contact:
    max_vel: 100.0
    min_depth: 0.001
    soft_cfm: 0.01
    soft_erp: 0.2
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Gazebo crashes with large terrain
```bash
# Solution: Increase Gazebo memory limits
export GAZEBO_MASTER_URI=http://localhost:11345
export GAZEBO_MODEL_DATABASE_URI=http://models.gazebosim.org

# Reduce terrain resolution
rosrun gazebo_ros spawn_model -file reduced_terrain.sdf
```

#### Issue 2: Robot sinks into terrain
```yaml
# Adjust collision parameters in URDF
<collision>
  <geometry>
    <box size="0.2 0.2 0.05"/>
  </geometry>
  <surface>
    <friction>
      <ode>
        <mu>100.0</mu>
        <mu2>100.0</mu2>
      </ode>
    </friction>
    <contact>
      <ode>
        <kp>1000000.0</kp>
        <kd>100.0</kd>
        <min_depth>0.001</min_depth>
      </ode>
    </contact>
  </surface>
</collision>
```

#### Issue 3: Slow simulation performance
```bash
# Disable shadows and reduce visual quality
export GAZEBO_DISABLE_SHADOWS=1

# Use headless mode for better performance
gzserver worlds/mars.world --verbose

# Connect client separately
gzclient --verbose
```

---

## Advanced Features

### Dust Storm Simulation
```python
# scripts/dust_storm_controller.py
import rclpy
from rclpy.node import Node
from gazebo_msgs.srv import SetEntityState
from geometry_msgs.msg import Pose, Twist
import numpy as np

class DustStormController(Node):
    def __init__(self):
        super().__init__('dust_storm_controller')

        self.client = self.create_client(
            SetEntityState,
            '/gazebo/set_entity_state'
        )

        self.timer = self.create_timer(0.1, self.update_dust_particles)
        self.particles = []
        self.time = 0.0

    def update_dust_particles(self):
        """Animate dust particles for storm effect"""
        self.time += 0.1

        for i, particle in enumerate(self.particles):
            # Circular wind pattern
            x = 20 * np.cos(self.time + i * 0.1)
            y = 20 * np.sin(self.time + i * 0.1)
            z = 5 + 2 * np.sin(self.time * 2)

            request = SetEntityState.Request()
            request.state.name = f'dust_particle_{i}'
            request.state.pose.position.x = x
            request.state.pose.position.y = y
            request.state.pose.position.z = z

            self.client.call_async(request)
```

### Sample Collection Scoring System
```python
# scripts/sample_collector_scorer.py
class SampleCollectorScorer(Node):
    def __init__(self):
        super().__init__('sample_scorer')

        self.samples_collected = []
        self.score = 0
        self.target_samples = [
            {'name': 'sample_01', 'points': 10, 'type': 'rock'},
            {'name': 'sample_02', 'points': 20, 'type': 'soil'},
            {'name': 'sample_03', 'points': 30, 'type': 'crystal'}
        ]

        # Subscribe to gripper state
        self.gripper_sub = self.create_subscription(
            JointState,
            '/gripper_controller/state',
            self.check_collection,
            10
        )

        # Publish score updates
        self.score_pub = self.create_publisher(
            Int32,
            '/mission/score',
            10
        )

    def check_collection(self, msg):
        """Check if a sample has been successfully collected"""
        if msg.position[0] > 0.5:  # Gripper closed
            # Check proximity to samples
            for sample in self.target_samples:
                if self.is_near_sample(sample['name']):
                    if sample['name'] not in self.samples_collected:
                        self.samples_collected.append(sample['name'])
                        self.score += sample['points']
                        self.get_logger().info(
                            f"Collected {sample['name']}! "
                            f"Score: {self.score}"
                        )
                        self.publish_score()
```

---

## Resources and References

### Official Documentation
- [NASA Mars 2020 Terrain Data](https://mars.nasa.gov/mars2020/multimedia/raw-images/)
- [ROS2 Gazebo Integration](https://docs.ros.org/en/humble/Tutorials/Advanced/Simulators/Gazebo.html)
- [Gazebo Heightmap Tutorial](http://gazebosim.org/tutorials?tut=heightmap)

### Research Papers
- "Simulation of Mars Rover Navigation using ROS and Gazebo" - IEEE 2024
- "Terrain-Adaptive Motion Planning for Planetary Rovers" - ICRA 2023

### Community Resources
- [ROS Mars Rover SIG](https://discourse.ros.org/t/mars-rover-sig)
- [Gazebo Community Forums](https://community.gazebosim.org)

---

## Contact and Support

**Course:** CS498GC Mobile Robotics - Fall 2025
**Instructor:** Professor Girish Chowdhary
**TA:** Kulbir Singh Ahluwalia

For technical issues, post on Campuswire with tag `#mars-simulation`

---

*Last Updated: November 8, 2025*