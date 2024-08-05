'use server';
import { auth, signIn, signOut } from '@/lib/auth';
import prisma from '@/lib/db';
import { sleep } from '@/lib/utils';
import { authSchema, petFormSchema, petIdSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { checkAuth, getPetById } from '@/lib/server-utils';

// --- USER ACTIONS --- //

export async function logIn(formData: unknown) {
  if (!(formData instanceof FormData)) {
    return {
      message: 'Invalid form data.',
    };
  }

  await signIn('credentials', formData);

  redirect('/app/dashboard');
}

export async function signUp(formData: unknown) {
  // check if formData is a FormData type
  if (!(formData instanceof FormData)) {
    return {
      message: 'Invalid form data.',
    };
  }

  // convert fofmData to a plain object
  const formDataEntries = Object.fromEntries(formData.entries());

  // validation
  const validatedFormData = authSchema.safeParse(formDataEntries);
  if (!validatedFormData.success) {
    return {
      message: 'Invalid form data.',
    };
  }

  const { email, password } = validatedFormData.data;
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      hashedPassword,
    },
  });

  await signIn('credentials', formData);
  redirect('/app/dashboard');
}

export async function logOut() {
  await signOut({ redirectTo: '/' });
}

// --- PET ACTIONS --- //

export async function addPet(pet: unknown) {
  await sleep(1000);

  // authentication check
  const session = await checkAuth();
  if (!session?.user) {
    redirect('/login');
  }

  const validatedPet = petFormSchema.safeParse(pet);
  if (!validatedPet.success) {
    return {
      messsage: 'Invalid pet data.',
    };
  }

  try {
    await prisma.pet.create({
      data: {
        ...validatedPet.data,
        user: {
          connect: {
            id: session.user.id,
          },
        },
      },
    });
  } catch (error) {
    console.log(error);
    return { message: 'Could not add pet.' };
  }

  revalidatePath('/app', 'layout');
}

export async function editPet(petId: unknown, newPetData: unknown) {
  await sleep(1000);

  // authentication check
  const session = await checkAuth();

  // validation
  const validatedPetId = petIdSchema.safeParse(petId);
  const validatedPet = petFormSchema.safeParse(newPetData);

  if (!validatedPet.success || !validatedPetId.success) {
    return {
      messsage: 'Invalid pet data.',
    };
  }

  // authorization check
  const pet = await getPetById(validatedPetId.data);

  if (!pet) {
    return {
      message: 'Pet not found.',
    };
  }
  if (pet.userId !== session.user.id) {
    return {
      message: 'Not authorized.',
    };
  }

  // database mutation
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

  // authentication check
  const session = await checkAuth();
  if (!session?.user) {
    redirect('/login');
  }

  // validation
  const validatedPetId = petIdSchema.safeParse(petId);

  if (!validatedPetId.success) {
    return {
      messsage: 'Invalid pet data.',
    };
  }

  // authorization check
  const pet = await getPetById(validatedPetId.data);

  if (!pet) {
    return {
      message: 'Pet not found.',
    };
  }

  if (pet.userId !== session.user.id) {
    return {
      message: 'Not authorized.',
    };
  }

  // database mutation
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
