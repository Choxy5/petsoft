'use client';

import { logOut } from '@/actions/actions';
import { Button } from '@/components/ui/button';

export default function SignOutBtn() {
  return <Button onClick={async () => await logOut()}>Sign out</Button>;
}
