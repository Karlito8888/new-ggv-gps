import { useState } from 'react';
import { FaCompass } from 'react-icons/fa';
import { MdGpsOff, MdError } from 'react-icons/md';
import useDeviceOrientation from '../hooks/useDeviceOrientation';
import styles from './orientationToggle.module.css';

/**
 * OrientationToggle - Button to control device orientation for GPS navigation
 * Handles Android and iOS permissions and provides user feedback
 */
const OrientationToggle = ({
  enabled = false,
  onToggle,
  className = ""
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  
  const {
    isSupported,
    permission,
    error,
    isActive,
    requestPermission,
    compass
  } = useDeviceOrientation({ 
    enabled
  });

  // Handle toggle click
  const handleToggle = async () => {
    if (!isSupported) {
      alert('Device orientation is not supported on this device/browser.');
      return;
    }

    if (!enabled) {
      // Enabling orientation
      if (permission !== 'granted') {
        setIsRequesting(true);
        
        try {
          const granted = await requestPermission();
          if (granted) {
            onToggle(true);
          }
        } catch (err) {
          console.error('Permission request failed:', err);
        } finally {
          setIsRequesting(false);
        }
      } else {
        onToggle(true);
      }
    } else {
      // Disabling orientation
      onToggle(false);
    }
  };

  // Get button state and styling
  const getButtonState = () => {
    if (!isSupported) {
      return {
        icon: MdError,
        bgColorClass: styles.bgGray400,
        tooltip: 'Device orientation not supported',
        disabled: true
      };
    }
    
    if (isRequesting) {
      return {
        icon: FaCompass,
        bgColorClass: `${styles.bgYellow500} ${styles.iconPulse}`,
        tooltip: 'Requesting permission...',
        disabled: true,
        iconClass: styles.iconSpin
      };
    }
    
    if (error || permission === 'denied') {
      return {
        icon: MdError,
        bgColorClass: styles.bgRed500,
        tooltip: error || 'Permission denied',
        disabled: false
      };
    }
    
    if (enabled && isActive) {
      return {
        icon: FaCompass,
        bgColorClass: styles.bgBlue500,
        tooltip: `Orientation active (${Math.round(compass)}°)`,
        disabled: false,
        iconClass: styles.iconRotation,
        iconStyle: { transform: `rotate(${Math.round(compass)}deg)` }
      };
    }
    
    if (enabled && !isActive) {
      return {
        icon: FaCompass,
        bgColorClass: `${styles.bgBlue400} ${styles.iconPulse}`,
        tooltip: 'Orientation starting...',
        disabled: false
      };
    }
    
    return {
      icon: MdGpsOff,
      bgColorClass: styles.bgGray600,
      tooltip: 'Enable device orientation',
      disabled: false
    };
  };

  const buttonState = getButtonState();
  const Icon = buttonState.icon;

  return (
    <>
      {/* Main orientation toggle button */}
      <div className={`${styles.container} ${className}`}>
        <button
          onClick={handleToggle}
          disabled={buttonState.disabled || isRequesting}
          className={`${styles.button} ${buttonState.bgColorClass}`}
          title={buttonState.tooltip}
        >
          <Icon 
            size={20} 
            className={buttonState.iconClass || ''}
            style={buttonState.iconStyle || {}}
          />
        </button>
      </div>


    </>
  );
};

export default OrientationToggle;