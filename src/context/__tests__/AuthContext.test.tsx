import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        }
    }
}));

// Test component to consume context
const TestComponent = () => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return <div>{user ? 'Authenticated' : 'Not Authenticated'}</div>;
};

describe('AuthContext', () => {
    it('renders children and provides auth state', async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Should start with loading
        expect(screen.getByText('Loading...')).toBeInTheDocument();

        // Should resolve to Not Authenticated (due to mock)
        await waitFor(() => {
            expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
        });
    });
});
