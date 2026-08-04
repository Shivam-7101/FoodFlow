import { redis } from '../config/redis.js'

export const setString = ({ prefix, id, data, EX, NX, XX }) => {

    const cleanedPrefix = prefix?.toString().trim()
    const cleanedId = id?.toString().trim()
    if (typeof data === 'string' && !data.trim()) return null;
    if (!cleanedId || !cleanedPrefix || data === undefined || data === null) return null;

    const key = `${cleanedPrefix}:${cleanedId}`

    let args = [key, data]

    if (EX) args.push('EX', EX);
    if (NX) args.push(NX);
    if (XX) args.push(XX);

    return redis.set(...args)
}

export const getString = ({ prefix, id }) => {

    const cleanedPrefix = prefix?.toString().trim()
    const cleanedId = id?.toString().trim()
    if (!cleanedId || !cleanedPrefix) return null;

    const key = `${cleanedPrefix}:${cleanedId}`

    return redis.get(key)
}

export const deleteStringKey = ({ prefix, id }) => {

    const cleanedPrefix = prefix?.toString().trim()
    const cleanedId = id?.toString().trim()
    if (!cleanedId || !cleanedPrefix) return null;

    const key = `${cleanedPrefix}:${cleanedId}`
    return redis.del(key)
}