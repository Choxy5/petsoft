'use server';
import { signIn } from '@/lib/auth';
import prisma from '@/lib/db';
import { sleep } from '@/lib/utils';
import { petFormSchema, petIdSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

// --- USER ACTIONS --- //

export async function logIn(formData: FormData) {
  const authData = Object.fromEntries(formData.entries());

  await signIn('credentials', authData);
}

// --- PET ACTIONS --- //

export async function addPet(pet: unknown) {
  await sleep(1000);

  const validatedPet = petFormSchema.safeParse(pet);
  if (!validatedPet.success) {
    return {
      messsage: 'Invalid pet data.',
    };
  }

  try {
    await prisma.pet.create({
      data: validatedPet.data,
    });
  } catch (error) {
    return { message: 'Could not add pet.' };
  }

  revalidatePath('/app', 'layout');
}

export async function editPet(petId: unknown, newPetData: unknown) {
  await sleep(1000);

  const validatedPetId = petIdSchema.safeParse(petId);
  const validatedPet = petFormSchema.safeParse(newPetData);

  if (!validatedPet.success || !validatedPetId.success) {
    return {
      messsage: 'Invalid pet data.',
    };
  }

  try {
    await prisma.pet.update({
      where: {
        id: validatedPetId.data,
      },
      data: validatedPet.data,
    });
  } catch (error) {
    return {
      message: 'Could not edit pet.',
    };
  }

  revalidatePath('/app', 'layout');
}

export async function deletePet(petId: unknown) {
  await sleep(1000);

  const validatedPetId = petIdSchema.safeParse(petId);

  if (!validatedPetId.success) {
    return {
      messsage: 'Invalid pet data.',
    };
  }
  try {
    await prisma.pet.delete({
      where: {
        id: validatedPetId.data,
      },
    });
  } catch (error) {
    return {
      message: 'Could not delte pet.',
    };
  }
  revalidatePath('/app', 'layout');
}
