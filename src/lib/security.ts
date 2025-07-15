import { toast } from 'react-hot-toast';

class SecurityManager {
  private sessionId: string;
  private tabSwitchCount = 0;
  private maxTabSwitches = 3;
  private lockoutDuration = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
  private isLocked = false;
  private onViolation?: () => void;

  constructor(sessionId: string, onViolation?: () => void) {
    this.sessionId = sessionId;
    this.onViolation = onViolation;
    this.initializeSecurity();
  }

  private initializeSecurity() {
    this.disableRightClick();
    this.detectTabSwitch();
    this.enforceFullScreen();
    this.disableDevTools();
    this.checkLockoutStatus();
  }

  private disableRightClick() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toast.error('Right-click is disabled during the quiz');
    });
  }

  private detectTabSwitch() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !this.isLocked) {
        this.tabSwitchCount++;
        toast.error(`Tab switch detected! ${this.maxTabSwitches - this.tabSwitchCount} attempts remaining`);
        
        if (this.tabSwitchCount >= this.maxTabSwitches) {
          this.triggerLockout();
        }
      }
    });

    window.addEventListener('blur', () => {
      if (!this.isLocked) {
        this.tabSwitchCount++;
        toast.error(`Window lost focus! ${this.maxTabSwitches - this.tabSwitchCount} attempts remaining`);
        
        if (this.tabSwitchCount >= this.maxTabSwitches) {
          this.triggerLockout();
        }
      }
    });
  }

  private enforceFullScreen() {
    const enterFullScreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    };

    // Request fullscreen on quiz start
    enterFullScreen();

    // Monitor fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && !this.isLocked) {
        toast.error('Please remain in fullscreen mode');
        setTimeout(enterFullScreen, 1000);
      }
    });
  }

  private disableDevTools() {
    document.addEventListener('keydown', (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        toast.error('Developer tools are disabled');
      }
    });
  }

  private triggerLockout() {
    this.isLocked = true;
    const lockoutEndTime = Date.now() + this.lockoutDuration;
    localStorage.setItem('quizLockout', lockoutEndTime.toString());
    
    toast.error('Quiz access locked for 1 hours due to security violations');
    this.onViolation?.();
  }

  private checkLockoutStatus() {
    const lockoutEndTime = localStorage.getItem('quizLockout');
    if (lockoutEndTime && Date.now() < parseInt(lockoutEndTime)) {
      this.isLocked = true;
      const remainingTime = parseInt(lockoutEndTime) - Date.now();
      const hours = Math.ceil(remainingTime / (60 * 60 * 1000));
      toast.error(`Quiz access locked for ${hours} more hours`);
      this.onViolation?.();
    }
  }

  public isUserLocked(): boolean {
    return this.isLocked;
  }

  public getRemainingAttempts(): number {
    return Math.max(0, this.maxTabSwitches - this.tabSwitchCount);
  }

  public destroy() {
    // Cleanup event listeners if needed
  }

  async terminate() {
    // Clean up all monitoring
    this.destroy();
    
    // Additional cleanup specific to your implementation
    if (this.recording) {
      await this.stopRecording();
    }

    return {
      sessionId: this.sessionId,
      violations: this.violations,
      monitoringDuration: Date.now() - this.startTime
    };
  }
}

export default SecurityManager;