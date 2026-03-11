/**
 * ResponsiveScreen – Reusable wrapper for adaptive layouts.
 * Rule III: Centering logic and maxWidth for premium web/mobile feel.
 */

import React from 'react';
import { 
    View, 
    StyleSheet, 
    useWindowDimensions, 
    ScrollView, 
    ScrollViewProps,
    ViewStyle,
} from 'react-native';
import { Colors, Spacing } from '../../theme/tokens';

interface ResponsiveScreenProps extends ScrollViewProps {
    children: React.ReactNode;
    maxWidth?: number;
    containerStyle?: ViewStyle;
    useScrollView?: boolean;
    contentContainerStyle?: ViewStyle;
    refreshControl?: React.ReactElement;
}

export function ResponsiveScreen(props: any) {
    const {
        children,
        maxWidth = 600,
        containerStyle,
        useScrollView = true,
        contentContainerStyle,
        refreshControl,
        ...scrollViewProps
    } = props;
    
    const { width } = useWindowDimensions();
    const isLarge = width > 850;

    const content = (
        <View style={[
            styles.inner,
            { maxWidth: isLarge ? (maxWidth > 600 ? maxWidth : 800) : '100.1%' },
            containerStyle
        ]}>
            {children}
        </View>
    );

    if (!useScrollView) {
        return (
            <View style={styles.screen}>
                <View style={[styles.outer, isLarge && styles.outerLarge]}>
                    {content}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <ScrollView
                {...scrollViewProps}
                refreshControl={refreshControl}
                contentContainerStyle={[
                    styles.scrollInner,
                    isLarge && styles.scrollInnerLarge,
                    isLarge ? styles.scrollPaddingLarge : styles.scrollPadding,
                    contentContainerStyle
                ]}
            >
                {content}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background.main,
    },
    outer: {
        flex: 1,
        alignItems: 'center',
    },
    outerLarge: {
        justifyContent: 'center',
        paddingVertical: Spacing.xl,
    },
    scrollInner: {
        flexGrow: 1,
    },
    scrollInnerLarge: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollPadding: {
        paddingVertical: Spacing.xxl,
    },
    inner: {
        width: '100%',
        paddingHorizontal: Spacing.lg,
    },
});
