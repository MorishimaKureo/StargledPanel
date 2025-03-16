const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');
const bcrypt = require('bcrypt'); // Tambahkan bcrypt untuk hashing password

const db = new sqlite3.Database('./databases/users.db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id TEXT, username TEXT, password TEXT, role TEXT)");

    async function createUser(isFirstUser = false) {
        rl.question('Enter username: ', (username) => {
            rl.question('Enter password: ', async (password) => {
                rl.question('Enter role (admin/user): ', async (role) => {
                    const id = isFirstUser ? "01" : require("uuid").v4();
                    const hashedPassword = await bcrypt.hash(password, 10); // Hash password sebelum disimpan
                    const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?)");
                    stmt.run(id, username, hashedPassword, role, (err) => {
                        if (err) {
                            console.error('Error inserting user:', err.message);
                        } else {
                            console.log('User created successfully');
                        }
                        stmt.finalize();
                        rl.question('Do you want to add another user? (yes/no): ', (answer) => {
                            if (answer.toLowerCase() === 'yes') {
                                createUser();
                            } else {
                                console.log('To start the panel type "node ."');
                                setTimeout(() => {
                                    rl.close();
                                    db.close();
                                }, 1000);
                            }
                        });
                    });
                });
            });
        });
    }

    createUser(true); // Create the first user with ID "01"
});
