interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}
export declare function sendEmail(options: EmailOptions): Promise<boolean>;
export declare function sendPasswordResetEmail(to: string, token: string): Promise<boolean>;
export declare function sendWelcomeEmail(to: string, name: string): Promise<boolean>;
export declare function sendNotificationEmail(to: string, title: string, message: string): Promise<boolean>;
export {};
