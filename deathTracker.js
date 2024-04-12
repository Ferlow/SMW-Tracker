class DeathTracker {
    constructor() {
        this.totalDeaths = 0;
        this.exitsCleared = 0;
        this.startTime = 0;
        this.elapsedTime = 0;
    }

    startTimer() {
        if (!this.timerInterval) {
            this.startTime = Date.now();
            this.timerInterval = setInterval(() => {
                this.updateElapsedTime();
            }, 1000); // Update every second
        }
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.elapsedTime += Date.now() - this.startTime;
            this.startTime = 0;
        }
    }

    updateElapsedTime() {
        if (this.startTime !== 0) {
            this.elapsedTime = Date.now() - this.startTime;
        }
    }

    getElapsedTime() {
        return this.formatTime(this.elapsedTime);
    }

    formatTime(milliseconds) {
        let totalSeconds = Math.floor(milliseconds / 1000);
        let seconds = totalSeconds % 60;
        let minutes = Math.floor(totalSeconds / 60) % 60;
        let hours = Math.floor(totalSeconds / 3600);
        return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
    }

    pad(number) {
        return String(number).padStart(2, '0');
    }

    addDeath() {
        this.totalDeaths++;
    }

    setExits(exits) {
        this.exitsCleared = exits;
    }

    getDeaths() {
        return this.totalDeaths;
    }

    getExits() {
        console.log(this.exitsCleared);
        return this.exitsCleared;
    }
}

module.exports = DeathTracker;