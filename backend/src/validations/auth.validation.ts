import { isEmail, maxLength, minLength, required, RequestSchema } from './validate';

export const registerSchema: RequestSchema = {
  body: {
    email: [required('Email'), isEmail()],
    password: [required('Password'), minLength(6, 'Password'), maxLength(128, 'Password')],
    name: [maxLength(128, 'Name')],
  },
};

export const loginSchema: RequestSchema = {
  body: {
    email: [required('Email'), isEmail()],
    password: [required('Password')],
  },
};
