import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 22,
    },
    compactHeader: {
        width: '100%',
        marginBottom: 16,
    },
    compactTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#183f20',
        marginBottom: 6,
    },
    compactDescription: {
        color: '#58795b',
        fontSize: 14,
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
        color: '#215a2a',
        marginBottom: 4,
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: '#4b7e50',
        marginBottom: 8,
    },
    form: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#d8e8da',
        padding: 20,
        shadowColor: '#102913',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
        marginBottom: 24,
    },
    input: {
        marginBottom: 18,
    },
    text: {
        fontSize: 13,
        color: '#315c36',
        marginBottom: 6,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    textInput: {
        height: 48,
        borderColor: '#cfe3d1',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: '#fbfefb',
        fontSize: 16,
        color: '#143217',
    },
    button: {
        backgroundColor: '#2f7a38',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
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