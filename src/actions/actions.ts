'use server';
import { auth, signIn, signOut } from '@/lib/auth';
import prisma from '@/lib/db';
import { sleep } from '@/lib/utils';
import { authSchema, petFormSchema, petIdSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { checkAuth, getPetById } from '@/lib/server-utils';
import { Prisma } from '@prisma/client';
import { AuthError } from 'next-auth';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// --- USER ACTIONS --- //

export async function logIn(prevState: unknown, formData: unknown) {
  await sleep(1000);

  if (!(formData instanceof FormData)) {
    return {
      message: 'Invalid form data.',
    };
  }

  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin': {
          return {
            message: 'Invalid credentials.',
          };
        }
        default: {
          return {
            message: 'Error. Could not sign in.',
          };
        }
      }
    }
    throw error; // nextjs redirects throw error, so we need to rethrow it
  }
}

export async function signUp(prevState: unknown, formData: unknown) {
  await sleep(1000);

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
  try {
    await prisma.user.create({
      data: {
        email,
        hashedPassword,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          message: 'Email already exists.',
        };
      }
    }
    return {
      message: 'Could not create user.',
    };
  }

  await signIn('credentials', formData);
  redirect('/app/dashboard');
}

export async function logOut() {
  await sleep(1000);

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

// --- payment actions --- //

export async function createCheckoutSession() {
  // authentication check
  const session = await checkAuth();

  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email,
    line_items: [
      {
        price: process.env.STRIPE_PRODUCT_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.CANONICAL_URL}/payment?success=true`,
    cancel_url: `${process.env.CANONICAL_URL}/payment?canceled=true`,
  });

  // redirect user
  redirect(checkoutSession.url);
}
