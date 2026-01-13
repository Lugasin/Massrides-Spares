import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, User, ShoppingBag, Database } from 'lucide-react';

const DevSetup: React.FC = () => {
    const { signUp, signOut } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);

    const createTestUser = async (role: 'super_admin' | 'vendor' | 'customer') => {
        setLoading(role);
        try {
            // First sign out any current user
            await signOut();

            const timestamp = Date.now().toString().slice(-4);
            const email = `${role}_${timestamp}@massrides.com`;
            const password = 'password123';
            const name = `Test ${role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;

            // Sign up the user
            // Note: The role passed here goes to user metadata. 
            // The trigger we set up in create_user_profiles.sql will use this metadata 
            // to populate the user_profiles table with the correct role.
            const { error } = await signUp(email, password, {
                full_name: name,
                company_name: role === 'vendor' ? 'Test Vendor Co.' : undefined,
                // Passing role in metadata so the trigger picks it up
                // @ts-ignore - bypassing partial type for custom metadata
                role: role
            });

            if (error) throw error;

            toast.success(`Created ${role} user: ${email}`);

            // Show credentials to user
            toast.info(`Login with: ${email} / ${password}`, {
                duration: 10000,
            });

        } catch (error: any) {
            console.error(`Error creating ${role}:`, error);
            toast.error(`Failed to create ${role}: ${error.message}`);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Developer Setup & Seeding</h1>
            <p className="text-muted-foreground mb-8">
                Use this dashboard to generate test users for different roles.
                Each button will sign out the current user and create a new one.
                <br />
                <strong>Note:</strong> Ensure you have run the <code>supabase/create_user_profiles.sql</code> script first!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Super Admin Card */}
                <Card className="border-red-200 bg-red-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <Shield className="h-5 w-5" />
                            Super Admin
                        </CardTitle>
                        <CardDescription>
                            Full system access, audits, and performance metrics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={() => createTestUser('super_admin')}
                            disabled={!!loading}
                        >
                            {loading === 'super_admin' ? 'Creating...' : 'Create Super Admin'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Vendor Card */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                            <Database className="h-5 w-5" />
                            Vendor
                        </CardTitle>
                        <CardDescription>
                            Inventory management, product addition, and order views.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => createTestUser('vendor')}
                            disabled={!!loading}
                        >
                            {loading === 'vendor' ? 'Creating...' : 'Create Vendor'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Customer Card */}
                <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                            <ShoppingBag className="h-5 w-5" />
                            Customer
                        </CardTitle>
                        <CardDescription>
                            Standard access, catalog browsing, and checkout.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => createTestUser('customer')}
                            disabled={!!loading}
                        >
                            {loading === 'customer' ? 'Creating...' : 'Create Customer'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Technical Note</h3>
                <p className="text-sm text-muted-foreground">
                    This tool creates users with email format <code>role_timestamp@massrides.com</code>.
                    The password for all accounts is <code>password123</code>.
                    <br />
                    These accounts are automatically verified if email confirmation is disabled in Supabase,
                    otherwise you may need to check the "Inbucket" or logs to verify them.
                </p>
            </div>
        </div>
    );
};

export default DevSetup;
