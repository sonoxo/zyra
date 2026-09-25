SHELL := /bin/bash
SIM := bash ./bin/zyra-sim

.PHONY: help sim-start sim-restart sim-status sim-mission sim-stop sim-qgc logs-px4 logs-mavsdk logs-mission

help:
	@echo "Zyra SITL commands:"
	@echo "  make sim-start      Start PX4 + Gazebo walls + X500 LiDAR + MAVSDK"
	@echo "  make sim-restart    Restart the full detached stack"
	@echo "  make sim-status     Show stack health"
	@echo "  make sim-mission    Launch Zyra mission in background"
	@echo "  make sim-qgc        Open QGroundControl"
	@echo "  make logs-px4       Show recent PX4/Gazebo log"
	@echo "  make logs-mavsdk    Show recent MAVSDK log"
	@echo "  make logs-mission   Show recent mission log"
	@echo "  make sim-stop       Stop the detached stack"

sim-start:
	@$(SIM) start

sim-restart:
	@$(SIM) restart

sim-status:
	@$(SIM) status

sim-mission:
	@$(SIM) mission

sim-stop:
	@$(SIM) stop

sim-qgc:
	@$(SIM) qgc

logs-px4:
	@$(SIM) logs px4

logs-mavsdk:
	@$(SIM) logs mavsdk

logs-mission:
	@$(SIM) logs mission
