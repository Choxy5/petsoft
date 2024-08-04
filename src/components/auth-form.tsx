import { logIn, signUp } from '@/actions/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthFormProps = {
  type: 'logIn' | 'signUp';
};

export default function AuthForm({ type }: AuthFormProps) {
  
  return (
    <form action={type === 'logIn' ? logIn : signUp}>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input name="email" id="email" type="email" />
      </div>
      <div className="space-y-1 mb-4 mt-2">
        <Label htmlFor="password">Password</Label>
        <Input name="password" id="password" type="password" />
      </div>

      <Button>{type === 'logIn' ? 'Log In' : 'Sign Up'}</Button>
    </form>
  );
}
