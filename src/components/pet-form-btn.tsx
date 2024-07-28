import { Button } from '@/components/ui/button';
import { useFormStatus } from 'react-dom';

export default function PetFormBtn({ actionType }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" className="mt-5 self-end">
      {actionType === 'add' ? 'Add a new pet' : 'Edit pet'}
    </Button>
  );
}
