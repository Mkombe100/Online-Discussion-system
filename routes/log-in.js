const router = require('express').Router();
const db = require('../configuration/databaseConnection');
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {

        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        const match = await bcrypt.compare(
            password,
            user.password
        );

        if (!match) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }

        req.session.user = {
            id: user.id,
            username: user.username || user.first_name || 'User',
            email: user.email
        };

        req.session.save(err => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: 'Session error'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                redirect: '/dashboard'
            });

        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            success: false,
            message: 'Login failed'
        });

    }
});

module.exports = router;