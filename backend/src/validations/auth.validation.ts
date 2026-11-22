import { isEmail, isString, maxLength, minLength, required, RequestSchema } from './validate';

export const registerSchema: RequestSchema = {
  body: {
    email: [required('Email'), isEmail()],
    password: [
      required('Password'),
      isString('Password'),
      minLength(8, 'Password'),
      maxLength(128, 'Password'),
    ],
    name: [isString('Name'), maxLength(128, 'Name')],
  },
};

export const loginSchema: RequestSchema = {
  body: {
    email: [required('Email'), isEmail()],
    // capped so a huge "password" can't be fed to scrypt
    password: [required('Password'), isString('Password'), maxLength(128, 'Password')],
  },
};
