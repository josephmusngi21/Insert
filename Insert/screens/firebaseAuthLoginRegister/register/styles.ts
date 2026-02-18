import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6faf6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 12,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginBottom: 4,
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: '#4caf50',
        marginBottom: 8,
    },
    form: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        marginBottom: 24,
    },
    input: {
        marginBottom: 18,
    },
    text: {
        fontSize: 14,
        color: '#388e3c',
        marginBottom: 6,
        fontWeight: '500',
    },
    textInput: {
        height: 44,
        borderColor: '#c8e6c9',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f9fff9',
        fontSize: 16,
        color: '#222',
    },
    button: {
        backgroundColor: '#43a047',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    footer: {
        display: 'flex',
        flexDirection: 'row',
        marginTop: 12,
        alignItems: 'center',
    },
    formFooter: {
        marginTop: 12,
        alignItems: 'center',
        width: '100%',
    },
    forgotPassword: {
        color: '#388e3c',
        fontSize: 12,
        marginTop: 10,
        textAlign: 'center',
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
    // footerText: {
    //     fontSize: 14,
    //     color: '#388e3c',
    //     fontWeight: '500',
    // },
    // footerLink: {
    //     color: '#2e7d32',
    //     fontSize: 14,
    //     fontWeight: 'bold',
    //     textDecorationLine: 'underline',
    // },
});

export default styles;