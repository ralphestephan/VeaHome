import Joi from 'joi';

export const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
  register: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
};

export const hubSchemas = {
  pairHub: Joi.object({
    qrCode: Joi.string().required(),
    homeId: Joi.string().uuid().required(),
  }),
  connectWifi: Joi.object({
    ssid: Joi.string().required(),
    password: Joi.string().required(),
  }),
  assignRooms: Joi.object({
    roomIds: Joi.array().items(Joi.string().uuid()).max(2).required(),
  }),
};

export const deviceSchemas = {
  addDevice: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
    category: Joi.string().required(),
    roomId: Joi.string().uuid().required(),
    hubId: Joi.string().uuid().required(),
  }),
  controlDevice: Joi.object({
    isActive: Joi.boolean().optional(),
    value: Joi.number().optional(),
  }),
  learnSignal: Joi.object({
    action: Joi.string().required(),
  }),
};

export const sceneSchemas = {
  createScene: Joi.object({
    name: Joi.string().required(),
    icon: Joi.string().optional(),
    description: Joi.string().optional(),
    deviceStates: Joi.object().required(),
    devices: Joi.array().items(Joi.string().uuid()).optional(),
  }),
};

export const scheduleSchemas = {
  createSchedule: Joi.object({
    name: Joi.string().required(),
    time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    days: Joi.array().items(Joi.string()).required(),
    actions: Joi.array().required(),
  }),
};
