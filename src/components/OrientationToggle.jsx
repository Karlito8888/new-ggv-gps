import { useState } from 'react';
import { FaCompass } from 'react-icons/fa';
import { MdGpsOff, MdError } from 'react-icons/md';
import useDeviceOrientation from '../hooks/useDeviceOrientation';

/**
 * OrientationToggle - Button to control device orientation for GPS navigation
 * Handles Android and iOS permissions and provides user feedback
 */
const OrientationToggle = ({ 
  enabled = false, 
  onToggle, 
  className = "",
  position = "top-right" 
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
    enabled,
    smoothingFactor: 0.8,
    throttleMs: 100 
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
        bgColor: 'bg-gray-400',
        textColor: 'text-white',
        tooltip: 'Device orientation not supported',
        disabled: true
      };
    }
    
    if (isRequesting) {
      return {
        icon: FaCompass,
        bgColor: 'bg-yellow-500 animate-pulse',
        textColor: 'text-white',
        tooltip: 'Requesting permission...',
        disabled: true,
        rotation: 'animate-spin'
      };
    }
    
    if (error || permission === 'denied') {
      return {
        icon: MdError,
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        tooltip: error || 'Permission denied',
        disabled: false
      };
    }
    
    if (enabled && isActive) {
      return {
        icon: FaCompass,
        bgColor: 'bg-blue-500',
        textColor: 'text-white',
        tooltip: `Orientation active (${Math.round(compass)}°)`,
        disabled: false,
        rotation: `rotate-[${Math.round(compass)}deg]`
      };
    }
    
    if (enabled && !isActive) {
      return {
        icon: FaCompass,
        bgColor: 'bg-blue-400 animate-pulse',
        textColor: 'text-white',
        tooltip: 'Orientation starting...',
        disabled: false
      };
    }
    
    return {
      icon: MdGpsOff,
      bgColor: 'bg-gray-600',
      textColor: 'text-white',
      tooltip: 'Enable device orientation',
      disabled: false
    };
  };

  const buttonState = getButtonState();
  const Icon = buttonState.icon;

  // Position classes
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "center-left": "top-1/2 left-3 -translate-y-1/2",
    "center-right": "top-1/2 right-3 -translate-y-1/2",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  };

  return (
    <>
      {/* Main orientation toggle button */}
      <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
        <button
          onClick={handleToggle}
          disabled={buttonState.disabled || isRequesting}
          className={`
            ${buttonState.bgColor} ${buttonState.textColor}
            w-12 h-12 rounded-full shadow-lg
            flex items-center justify-center
            transition-all duration-300
            hover:scale-110 active:scale-95
            disabled:cursor-not-allowed disabled:opacity-50
          `}
          title={buttonState.tooltip}
        >
          <Icon 
            size={20} 
            className={`
              ${buttonState.rotation || ''} 
              transition-transform duration-500
            `}
          />
        </button>
      </div>


    </>
  );
};

export default OrientationToggle;