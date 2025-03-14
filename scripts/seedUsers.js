const sqlite3 = require('sqlite3').verbose();
const { time } = require('console');
const readline = require('readline');

const db = new sqlite3.Database('./users.db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (username TEXT, password TEXT, role TEXT)");

    function createUser() {
        rl.question('Enter username: ', (username) => {
            rl.question('Enter password: ', (password) => {
                rl.question('Enter role (admin/user): ', (role) => {
                    const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?)");
                    stmt.run(username, password, role, (err) => {
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
                                }
                                , 1000);
                            }
                        });
                    });
                });
            });
        });
    }

    createUser();
});
