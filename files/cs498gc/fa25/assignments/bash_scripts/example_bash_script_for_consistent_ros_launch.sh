#!/usr/bin/env bash
# =============================================================================
# CS 498 GC / ABE 426 — Mobile Robotics for Computer Scientists (UIUC, Fall 2025)
# Example: a CONSISTENT ROS 2 launch script (8-terminal setup)
#
# Why this exists: the #1 source of "works on my machine" bugs in ROS is each
# terminal being sourced differently. This template opens every terminal the
# SAME way — same ROS distro, same workspace overlay, same env — so your whole
# stack (sim + description + SLAM + Nav2 + RViz + teleop + arm + monitor) comes
# up reproducibly every time.
#
# HOW TO USE:
#   1. Edit the CONFIG block below (WS, PKG, launch/run lines) for YOUR project
#      — this same template works for the Husky+UR3 mobile-manipulator project
#      and the Curiosity Mars-rover SLAM project; just swap the packages/launch.
#   2. chmod +x example_bash_script_for_consistent_ros_launch.sh
#   3. ./example_bash_script_for_consistent_ros_launch.sh
#
# Requires: ROS 2 Humble, a built colcon workspace, gnome-terminal.
# TA: Kulbir Singh Ahluwalia (ksa5@illinois.edu). Adapt freely.
# =============================================================================
set -u

# ------------------------------- CONFIG --------------------------------------
ROS_DISTRO_SETUP="/opt/ros/humble/setup.bash"      # your ROS 2 distro
WS="${HOME}/ros2_ws"                               # your colcon workspace root
WS_SETUP="${WS}/install/setup.bash"                # overlay (built with colcon)
export ROS_DOMAIN_ID="${ROS_DOMAIN_ID:-0}"         # keep the SAME id in every terminal
export RCUTILS_COLORIZED_OUTPUT=1
LAUNCH_DELAY=3                                     # seconds between terminals (let each come up)
# -----------------------------------------------------------------------------

# One consistent preamble every terminal runs before your command.
PREAMBLE="source ${ROS_DISTRO_SETUP}; \
[ -f ${WS_SETUP} ] && source ${WS_SETUP}; \
export ROS_DOMAIN_ID=${ROS_DOMAIN_ID};"

# t "<Title>" "<command>"  -> open a titled terminal, source consistently, run, keep open.
t() {
  local title="$1"; shift
  gnome-terminal --title="$title" -- bash -c "${PREAMBLE} echo '[+] ${title}'; $*; exec bash"
  sleep "${LAUNCH_DELAY}"
}

# Sanity checks (fail loudly, not silently).
[ -f "${ROS_DISTRO_SETUP}" ] || { echo "ERROR: ${ROS_DISTRO_SETUP} not found — is ROS 2 Humble installed?"; exit 1; }
[ -f "${WS_SETUP}" ] || echo "WARN: ${WS_SETUP} not found — build first: (cd ${WS} && colcon build). Sim terminals may fail until then."
command -v gnome-terminal >/dev/null || { echo "ERROR: gnome-terminal not found (sudo apt install gnome-terminal)"; exit 1; }

echo "Launching 8-terminal ROS 2 stack (distro=humble, WS=${WS}, DOMAIN_ID=${ROS_DOMAIN_ID}) ..."

# ------------------------- 8-TERMINAL STACK ----------------------------------
# Replace the ros2 launch/run lines with your project's actual packages.
t "1 · Gazebo sim (world + robot)"        "ros2 launch <your_sim_pkg> world.launch.py"
t "2 · Robot state publisher / description" "ros2 launch <your_desc_pkg> description.launch.py"
t "3 · SLAM (slam_toolbox)"                "ros2 launch slam_toolbox online_async_launch.py"
t "4 · Nav2 (navigation)"                  "ros2 launch nav2_bringup navigation_launch.py use_sim_time:=true"
t "5 · RViz2 (visualization)"              "ros2 run rviz2 rviz2"
t "6 · Teleop (keyboard)"                  "ros2 run teleop_twist_keyboard teleop_twist_keyboard"
t "7 · Manipulator / MoveIt (Husky+UR3)"   "ros2 launch <your_moveit_pkg> move_group.launch.py"
t "8 · Monitor (topics/tf)"                "ros2 topic list; echo '---'; ros2 topic hz /scan"
# -----------------------------------------------------------------------------

echo "[✓] Launched all 8 terminals. Same distro, same workspace, same ROS_DOMAIN_ID in every one."
echo "    To stop everything: close the terminals, or  pkill -f 'ros2|gzserver|gzclient|rviz2'"
