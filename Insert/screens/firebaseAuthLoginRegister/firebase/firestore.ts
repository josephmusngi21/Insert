import { db } from './config';
import { collection, getDocs } from 'firebase/firestore/lite';

export async function getPlants() {
    const plantsCol = collection(db, 'plants');
    const plantSnapshot = await getDocs(plantsCol);
    const plantList = plantSnapshot.docs.map(doc => doc.data());
    return plantList;
};