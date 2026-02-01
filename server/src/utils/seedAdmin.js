import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

/**
 * Seed admin user into database
 */
const seedAdmin = async () => {
    try {
        // Check if admin already exists
        const adminEmail = 'itsanuragmishra99@gmail.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists');
            return;
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('987654321Anu', salt);

        const admin = new User({
            name: 'Admin',
            email: adminEmail,
            passwordHash,
            role: 'admin'
        });

        await admin.save();
        console.log('✅ Admin user created successfully');
        console.log('   Email:', adminEmail);
        console.log('   Password: 987654321Anu');

    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        throw error; // Let the caller handle the error
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedAdmin();
}

export default seedAdmin;
