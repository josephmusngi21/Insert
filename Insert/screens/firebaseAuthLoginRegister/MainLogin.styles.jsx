import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    footer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        width: '100%',
        backgroundColor: '#f6faf6',
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
    },
    footerText: {
        fontSize: 14,
        color: '#388e3c',
        fontWeight: '500',
        marginRight: 4,
    },
    footerLink: {
        color: '#2e7d32',
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

export default styles;