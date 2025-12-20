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
    hubId: Joi.string()
      .uuid()
      .when('type', {
        is: 'airguard',
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
    unit: Joi.string().optional(),
    signalMappings: Joi.object().optional(),
  }),
  controlDevice: Joi.object({
    isActive: Joi.boolean().optional(),
    value: Joi.number().optional(),
  }),
  learnSignal: Joi.object({
    action: Joi.string().required(),
  }),
};

const colorPattern = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export const homeSchemas = {
  createRoom: Joi.object({
    name: Joi.string().required(),
    scene: Joi.string().allow(null).optional(),
    image: Joi.string().uri().optional(),
    layoutPath: Joi.string().optional(),
    accentColor: Joi.string().pattern(colorPattern).optional(),
    metadata: Joi.object().optional(),
  }),
  updateRoom: Joi.object({
    name: Joi.string().optional(),
    scene: Joi.string().allow(null).optional(),
    image: Joi.string().uri().optional(),
    layoutPath: Joi.string().optional(),
    accentColor: Joi.string().pattern(colorPattern).optional(),
    metadata: Joi.object().optional(),
  }),
  updateLayout: Joi.object({
    layout: Joi.object().required(),
  }),
};

export const sceneSchemas = {
  createScene: Joi.object({
    name: Joi.string().required(),
    icon: Joi.string().optional(),
    description: Joi.string().optional(),
    // New hierarchical format
    scope: Joi.string().valid('home', 'rooms').optional(),
    roomIds: Joi.array().items(Joi.string().uuid()).optional(),
    deviceTypeRules: Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
        mode: Joi.string().valid('all', 'specific').required(),
        deviceIds: Joi.array().items(Joi.string().uuid()).optional(),
        state: Joi.object().required(),
      })
    ).optional(),
    // Old format (backwards compatibility)
    deviceStates: Joi.object().optional(),
    devices: Joi.array().items(Joi.string().uuid()).optional(),
  }),
  updateScene: Joi.object({
    name: Joi.string().optional(),
    icon: Joi.string().optional(),
    description: Joi.string().optional(),
    // New hierarchical format
    scope: Joi.string().valid('home', 'rooms').optional(),
    roomIds: Joi.array().items(Joi.string().uuid()).optional(),
    deviceTypeRules: Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
        mode: Joi.string().valid('all', 'specific').required(),
        deviceIds: Joi.array().items(Joi.string().uuid()).optional(),
        state: Joi.object().required(),
      })
    ).optional(),
    // Old format (backwards compatibility)
    deviceStates: Joi.object().optional(),
    devices: Joi.array().items(Joi.string().uuid()).optional(),
  }),
};

export const scheduleSchemas = {
  createSchedule: Joi.object({
    name: Joi.string().required(),
    time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    days: Joi.array().items(Joi.string()).required(),
    actions: Joi.array().required(),
    enabled: Joi.boolean().optional(),
  }),
  updateSchedule: Joi.object({
    name: Joi.string().optional(),
    time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    days: Joi.array().items(Joi.string()).optional(),
    actions: Joi.array().optional(),
    enabled: Joi.boolean().optional(),
  }),
};

export const deviceGroupSchemas = {
  createGroup: Joi.object({
    name: Joi.string().required(),
    deviceIds: Joi.array().items(Joi.string().uuid()).default([]),
  }),
  updateGroup: Joi.object({
    name: Joi.string().optional(),
    deviceIds: Joi.array().items(Joi.string().uuid()).optional(),
  }),
};

export const automationSchemas = {
  createAutomation: Joi.object({
    name: Joi.string().required(),
    trigger: Joi.object().optional(), // Legacy support
    triggers: Joi.array().optional(), // New format
    actions: Joi.array().required(),
    enabled: Joi.boolean().optional(),
  }),
  updateAutomation: Joi.object({
    name: Joi.string().optional(),
    trigger: Joi.object().optional(), // Legacy support
    triggers: Joi.array().optional(), // New format
    actions: Joi.array().optional(),
    enabled: Joi.boolean().optional(),
  }),
};
