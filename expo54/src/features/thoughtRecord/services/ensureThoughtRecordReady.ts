import AsyncStorage from "@react-native-async-storage/async-storage";
import type {SQLiteDatabase} from "expo-sqlite";
import {DistortionData} from "@/model";
import {getDatabase} from "@/services/database/client";
import {mmkv} from "@/services/storage/mmkv";
import {importLegacyAsyncStorageData} from "./legacyImport";

let ready: Promise<SQLiteDatabase> | null = null;

export function ensureThoughtRecordReady(): Promise<SQLiteDatabase> {
	if (ready === null) ready = getDatabase().then(async (db) => {
		await importLegacyAsyncStorageData(DistortionData, db, AsyncStorage, mmkv);
		return db;
	}).catch((error) => {
		ready = null;
		throw error;
	});
	return ready;
}
