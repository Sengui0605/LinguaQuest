/**
 * LinguaQuest - License Management Script
 * 
 * Usage:
 *   node scripts/manage_licenses.js generate <name> <max_devices>
 *   node scripts/manage_licenses.js list
 *   node scripts/manage_licenses.js delete <licenseKey>
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: scripts/serviceAccountKey.json not found.');
    console.log('\nTo use this script, follow these steps:');
    console.log('1. Go to Firebase Console > Project Settings > Service Accounts.');
    console.log('2. Click "Generate new private key".');
    console.log('3. Rename the downloaded file to "serviceAccountKey.json" and move it to the "scripts/" directory.');
    console.log('4. IMPORTANT: Add "scripts/serviceAccountKey.json" to your .gitignore if not already there.\n');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const licensesCol = db.collection('teacher_licenses');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
    switch (command) {
        case 'generate':
            await generateLicense(args[1], args[2]);
            break;
        case 'list':
            await listLicenses();
            break;
        case 'delete':
            await deleteLicense(args[1]);
            break;
        default:
            console.log('Usage:');
            console.log('  node scripts/manage_licenses.js generate <name> <max_devices>');
            console.log('  node scripts/manage_licenses.js list');
            console.log('  node scripts/manage_licenses.js delete <licenseKey>');
    }
}

async function generateLicense(name, maxDevices) {
    if (!name || !maxDevices) {
        console.error('❌ Error: Missing arguments. Usage: generate <name> <max_devices>');
        return;
    }

    const licenseKey = 'LQ-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    const licenseData = {
        teacher_name: name,
        max_devices: parseInt(maxDevices),
        status: 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        active_devices: []
    };

    try {
        await licensesCol.doc(licenseKey).set(licenseData);
        console.log(`\n✅ License generated successfully!`);
        console.log(`-----------------------------------`);
        console.log(`Teacher:     ${name}`);
        console.log(`Max Devices: ${maxDevices}`);
        console.log(`License Key: ${licenseKey}`);
        console.log(`-----------------------------------\n`);
    } catch (error) {
        console.error('❌ Error creating license:', error);
    }
}

async function listLicenses() {
    try {
        const snapshot = await licensesCol.get();
        if (snapshot.empty) {
            console.log('No licenses found.');
            return;
        }

        console.log('\n--- Active Teacher Licenses ---');
        snapshot.forEach(doc => {
            const data = doc.data();
            const deviceCount = data.active_devices ? data.active_devices.length : 0;
            console.log(`[${doc.id}] - ${data.teacher_name} (${deviceCount}/${data.max_devices} devices) - Status: ${data.status}`);
        });
        console.log('-------------------------------\n');
    } catch (error) {
        console.error('❌ Error listing licenses:', error);
    }
}

async function deleteLicense(key) {
    if (!key) {
        console.error('❌ Error: License key required.');
        return;
    }

    try {
        await licensesCol.doc(key).delete();
        console.log(`✅ License ${key} deleted.`);
    } catch (error) {
        console.error('❌ Error deleting license:', error);
    }
}

main().catch(console.error);
