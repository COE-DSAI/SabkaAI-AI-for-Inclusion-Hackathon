/**
 * Modern UI Components Library
 * Inspired by fitness app design with cards, buttons, badges
 */
import React, { ReactNode, useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
  ActivityIndicator,
  Animated,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useModernTheme, ModernTheme } from '../../theme';

// ============= TOAST SYSTEM =============
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: ToastMessage; onHide: () => void }> = ({ toast, onHide }) => {
  const { theme } = useModernTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(onHide);
    }, toast.duration || 3000);

    return () => clearTimeout(hideTimer);
  }, []);

  const config = {
    success: { icon: 'checkmark-circle' as const, bg: theme.colors.success, color: '#FFFFFF' },
    error: { icon: 'close-circle' as const, bg: theme.colors.error, color: '#FFFFFF' },
    warning: { icon: 'warning' as const, bg: theme.colors.warning, color: '#000000' },
    info: { icon: 'information-circle' as const, bg: theme.colors.info, color: '#FFFFFF' },
  };

  const { icon, bg, color } = config[toast.type];

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bg,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        gap: 10,
      }}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ flex: 1, color, fontSize: 15, fontWeight: '500' }}>{toast.message}</Text>
      <TouchableOpacity onPress={onHide}>
        <Ionicons name="close" size={18} color={color} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={{
          position: 'absolute',
          top: 60,
          left: 16,
          right: 16,
          zIndex: 9999,
        }}
        pointerEvents="box-none"
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onHide={() => hideToast(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

// ============= EDIT MODAL COMPONENT =============
interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}

export const EditModal: React.FC<EditModalProps> = ({
  visible,
  onClose,
  title,
  value,
  onSave,
  placeholder = 'Enter text...',
  multiline = true,
  maxLength = 500,
}) => {
  const { theme } = useModernTheme();
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue.trim());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.backgroundCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                }}
              >
                {title}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Text Input */}
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textTertiary}
              multiline={multiline}
              maxLength={maxLength}
              style={{
                backgroundColor: theme.colors.surfaceSecondary,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
                fontSize: 16,
                color: theme.colors.textPrimary,
                minHeight: multiline ? 150 : 50,
                textAlignVertical: 'top',
                marginBottom: 12,
              }}
            />

            {/* Character count */}
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.textTertiary,
                textAlign: 'right',
                marginBottom: 20,
              }}
            >
              {editValue.length}/{maxLength}
            </Text>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Cancel"
                onPress={onClose}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Save"
                onPress={handleSave}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============= CARD COMPONENT =============
interface CardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default', onPress }) => {
  const { theme } = useModernTheme();
  const styles = createCardStyles(theme, variant);

  const content = <View style={[styles.card, style]}>{children}</View>;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const createCardStyles = (theme: ModernTheme, variant: string) =>
  StyleSheet.create({
    card: {
      backgroundColor: variant === 'elevated' ? theme.colors.backgroundElevated : theme.colors.backgroundCard,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: theme.colors.border,
      ...(variant === 'elevated' ? theme.shadows.md : {}),
    },
  });

// ============= BUTTON COMPONENT =============
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const { theme } = useModernTheme();
  const styles = createButtonStyles(theme, variant, size, fullWidth, disabled);

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? theme.colors.textInverse : theme.colors.accent} 
          size="small" 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={iconSize} color={styles.text.color as string} style={{ marginRight: 8 }} />
          )}
          <Text style={styles.text}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={iconSize} color={styles.text.color as string} style={{ marginLeft: 8 }} />
          )}
        </>
      )}
    </>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={style}
      >
        <LinearGradient
          colors={[theme.colors.accentGradientStart, theme.colors.accentGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[styles.button, style]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const createButtonStyles = (
  theme: ModernTheme,
  variant: string,
  size: string,
  fullWidth: boolean,
  disabled: boolean
) => {
  const paddingY = size === 'sm' ? 8 : size === 'lg' ? 18 : 14;
  const paddingX = size === 'sm' ? 16 : size === 'lg' ? 32 : 24;
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  const getBackgroundColor = () => {
    if (disabled) return theme.colors.surfaceSecondary;
    switch (variant) {
      case 'secondary':
        return theme.colors.surfaceSecondary;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.accent;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textTertiary;
    switch (variant) {
      case 'primary':
        return theme.colors.textInverse;
      case 'secondary':
        return theme.colors.textPrimary;
      case 'outline':
      case 'ghost':
        return theme.colors.accent;
      default:
        return theme.colors.textInverse;
    }
  };

  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: paddingY,
      paddingHorizontal: paddingX,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: getBackgroundColor(),
      borderWidth: variant === 'outline' ? 2 : 0,
      borderColor: variant === 'outline' ? theme.colors.accent : 'transparent',
      width: fullWidth ? '100%' : undefined,
      opacity: disabled ? 0.6 : 1,
    },
    text: {
      fontSize,
      fontWeight: '600',
      color: getTextColor(),
    },
  });
};

// ============= BADGE COMPONENT =============
interface BadgeProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, icon, variant = 'default', size = 'md' }) => {
  const { theme } = useModernTheme();
  const styles = createBadgeStyles(theme, variant, size);

  return (
    <View style={styles.badge}>
      {icon && <Ionicons name={icon} size={size === 'sm' ? 10 : 12} color={styles.text.color as string} />}
      {label && <Text style={styles.text}>{label}</Text>}
    </View>
  );
};

const createBadgeStyles = (theme: ModernTheme, variant: string, size: string) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: theme.colors.successLight, text: theme.colors.success };
      case 'warning':
        return { bg: theme.colors.warningLight, text: theme.colors.warning };
      case 'error':
        return { bg: theme.colors.errorLight, text: theme.colors.error };
      case 'info':
        return { bg: theme.colors.infoLight, text: theme.colors.info };
      default:
        return { bg: theme.colors.surfaceSecondary, text: theme.colors.textSecondary };
    }
  };

  const colors = getColors();
  const padding = size === 'sm' ? 4 : 6;
  const fontSize = size === 'sm' ? 10 : 12;

  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: padding,
      paddingHorizontal: padding * 2,
      borderRadius: theme.borderRadius.full,
      backgroundColor: colors.bg,
      gap: 4,
    },
    text: {
      fontSize,
      fontWeight: '600',
      color: colors.text,
    },
  });
};

// ============= STATUS INDICATOR =============
interface StatusIndicatorProps {
  status: 'processed' | 'processing' | 'unprocessed' | 'error';
  showLabel?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, showLabel = false }) => {
  const { theme } = useModernTheme();

  const config = {
    processed: { icon: 'checkmark-circle' as const, color: theme.colors.success, label: 'Processed' },
    processing: { icon: 'time' as const, color: theme.colors.warning, label: 'Processing' },
    unprocessed: { icon: 'ellipse-outline' as const, color: theme.colors.textTertiary, label: 'Pending' },
    error: { icon: 'close-circle' as const, color: theme.colors.error, label: 'Error' },
  };

  const { icon, color, label } = config[status] || config.unprocessed;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: `${color}20`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={14} color={color} />
      </View>
      {showLabel && (
        <Text style={{ fontSize: 12, color, fontWeight: '500' }}>{label}</Text>
      )}
    </View>
  );
};

// ============= SECTION HEADER =============
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => {
  const { theme } = useModernTheme();

  return (
    <View style={{ 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    }}>
      <View>
        <Text style={{ 
          fontSize: theme.typography.fontSize.xl, 
          fontWeight: '700', 
          color: theme.colors.textPrimary 
        }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ 
            fontSize: theme.typography.fontSize.sm, 
            color: theme.colors.textSecondary,
            marginTop: 2,
          }}>
            {subtitle}
          </Text>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={{ 
            fontSize: theme.typography.fontSize.md, 
            fontWeight: '600', 
            color: theme.colors.accent 
          }}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============= STAT CARD =============
interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({ icon, value, label, trend }) => {
  const { theme } = useModernTheme();

  return (
    <Card variant="elevated" style={{ minWidth: 100, alignItems: 'center' }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${theme.colors.accent}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.sm,
        }}
      >
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
      </View>
      <Text style={{ 
        fontSize: theme.typography.fontSize.xxl, 
        fontWeight: '700', 
        color: theme.colors.textPrimary,
      }}>
        {value}
      </Text>
      <Text style={{ 
        fontSize: theme.typography.fontSize.sm, 
        color: theme.colors.textSecondary,
        marginTop: 2,
      }}>
        {label}
      </Text>
      {trend && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Ionicons 
            name={trend.isPositive ? 'arrow-up' : 'arrow-down'} 
            size={12} 
            color={trend.isPositive ? theme.colors.success : theme.colors.error} 
          />
          <Text style={{ 
            fontSize: 10, 
            color: trend.isPositive ? theme.colors.success : theme.colors.error,
            marginLeft: 2,
          }}>
            {trend.value}%
          </Text>
        </View>
      )}
    </Card>
  );
};

// ============= TOGGLE ROW =============
interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ icon, title, subtitle, value, onValueChange }) => {
  const { theme } = useModernTheme();

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: theme.colors.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
      }}>
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ 
          fontSize: theme.typography.fontSize.lg, 
          fontWeight: '500', 
          color: theme.colors.textPrimary 
        }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ 
            fontSize: theme.typography.fontSize.sm, 
            color: theme.colors.textSecondary,
            marginTop: 2,
          }}>
            {subtitle}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => onValueChange(!value)}
        activeOpacity={0.8}
        style={{
          width: 52,
          height: 32,
          borderRadius: 16,
          backgroundColor: value ? theme.colors.accent : theme.colors.surfaceSecondary,
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <View style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: theme.colors.textPrimary,
          alignSelf: value ? 'flex-end' : 'flex-start',
        }} />
      </TouchableOpacity>
    </View>
  );
};

// ============= EMPTY STATE =============
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => {
  const { theme } = useModernTheme();

  return (
    <View style={{ 
      flex: 1, 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: theme.spacing.xl,
    }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg,
      }}>
        <Ionicons name={icon} size={40} color={theme.colors.textTertiary} />
      </View>
      <Text style={{ 
        fontSize: theme.typography.fontSize.xl, 
        fontWeight: '700', 
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
      }}>
        {title}
      </Text>
      <Text style={{ 
        fontSize: theme.typography.fontSize.md, 
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme.spacing.lg,
      }}>
        {subtitle}
      </Text>
      {action && (
        <Button 
          title={action.label} 
          onPress={action.onPress} 
          icon="add-circle-outline" 
        />
      )}
    </View>
  );
};

// ============= PROGRESS RING =============
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ 
  progress, 
  size = 60, 
  strokeWidth = 6,
  showPercentage = true,
}) => {
  const { theme } = useModernTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ 
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: theme.colors.surfaceSecondary,
      }} />
      <View style={{ 
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: theme.colors.accent,
        borderLeftColor: 'transparent',
        borderBottomColor: progress > 25 ? theme.colors.accent : 'transparent',
        borderRightColor: progress > 50 ? theme.colors.accent : 'transparent',
        borderTopColor: progress > 75 ? theme.colors.accent : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
      {showPercentage && (
        <Text style={{ 
          fontSize: size * 0.25, 
          fontWeight: '700', 
          color: theme.colors.textPrimary,
        }}>
          {Math.round(progress)}%
        </Text>
      )}
    </View>
  );
};
