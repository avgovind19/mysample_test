import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import session from 'express-session';

// extend express-session types for our session shape
declare module 'express-session' {
    interface SessionData {
        user?: { username: string };
    }
}

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session middleware (mock, in-memory store — replace for production)
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dev-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 2 },
    })
);

// Serve static assets from the `public` folder next to this file (src/public)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to Veeragovindu!!!!', version: '1.0.0' });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});


// return current user from session
app.get('/me', (req: Request, res: Response) => {
    if (req.session && req.session.user) {
        return res.json({ user: req.session.user });
    }
    return res.status(401).json({ user: null });
});

// Serve login page
app.get('/login', (req: Request, res: Response) => {
    console.log('[GET] /login requested from', req.ip || req.connection.remoteAddress);
    return res.redirect('/login.html');
});



// Simple login handler (mock authentication) — stores user in session
app.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    console.log(`[login] attempt: username=${username ?? '<empty>'}`);
    if (!username || !password) {
        console.log('[login] missing credentials');
        return res.status(400).json({ success: false, message: 'username and password required' });
    }

    if (username === 'admin' && password === 'password') {
        console.log('[login] success for', username);
        if (req.session) req.session.user = { username };
        return res.json({ success: true, user: { username } });
    }

    console.log('[login] failed for', username);
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Logout - clears mock auth cookie
app.post('/logout', (req: Request, res: Response) => {
    console.log('[logout] requested');
    if (req.session) {
        req.session.destroy((err) => {
            if (err) console.error('session destroy error', err);
        });
    }
    return res.json({ success: true, message: 'Logged out' });
});

app.get('/logout', (req: Request, res: Response) => {
    console.log('[logout] requested (GET)');
    if (req.session) {
        req.session.destroy((err) => {
            if (err) console.error('session destroy error', err);
        });
    }
    return res.json({ success: true, message: 'Logged out' });
});

// simple auth guard for routes
function requireAuth(req: Request, res: Response, next: Function) {
    if (req.session && req.session.user) return next();
    return res.status(401).json({ error: 'unauthorized' });
}

// serve dynamic form page only to authenticated users
app.get('/dynamic-form', (req: Request, res: Response) => {
    if (req.session && req.session.user) {
        return res.sendFile(path.join(__dirname, 'public', 'dynamic-form.html'));
    }
    return res.redirect('/login.html');
});
// ----- Dynamic form endpoints -----
const submittedForms: Array<{ id: number; data: any; timestamp: string }> = [];
const dataDir = path.join(__dirname, '..', 'data');
const submissionsFile = path.join(dataDir, 'form-submissions.json');

async function ensureDataFile() {
    try {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.access(submissionsFile);
    } catch (e) {
        await fs.writeFile(submissionsFile, '[]', 'utf8');
    }
}

async function loadSubmissionsFromFile() {
    try {
        const raw = await fs.readFile(submissionsFile, 'utf8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
            submittedForms.length = 0;
            arr.forEach((r) => submittedForms.push(r));
        }
    } catch (e) {
        // ignore — file may not exist yet
    }
}

// initialize data file on startup
ensureDataFile().then(() => loadSubmissionsFromFile()).catch(() => { });

app.get('/form/schema', (req: Request, res: Response) => {
    const schema = {
        title: 'Contact Form',
        fields: [
            { name: 'fullName', label: 'Full name', type: 'text', required: true },
            { name: 'phNumber', label: 'Phone number', type: 'text', required: true },
            { name: 'address', label: 'Address details', type: 'textarea', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'age', label: 'Age', type: 'number' },
            { name: 'message', label: 'Message', type: 'textarea' }
        ]
    };
    res.json(schema);
});

app.post('/form/submit', requireAuth, async (req: Request, res: Response) => {
    const data = req.body as Record<string, any>;

    // server-side validation according to schema
    const errors: string[] = [];
    if (!data.fullName || String(data.fullName).trim().length === 0) errors.push('fullName is required');
    if (!data.phNumber || String(data.phNumber).trim().length === 0) errors.push('phNumber is required');
    if (data.phNumber && !/^\+?[0-9 \-()]{7,20}$/.test(String(data.phNumber))) errors.push('phNumber is invalid');
    if (!data.address || String(data.address).trim().length === 0) errors.push('address is required');
    if (!data.email || String(data.email).trim().length === 0) errors.push('email is required');
    if (data.email && !/^\S+@\S+\.\S+$/.test(String(data.email))) errors.push('email is invalid');
    if (data.age && isNaN(Number(data.age))) errors.push('age must be a number');

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    const id = submittedForms.length + 1;
    const record = { id, data, timestamp: new Date().toISOString() };
    submittedForms.push(record);
    try {
        // persist to file
        const fileArr = JSON.parse(await fs.readFile(submissionsFile, 'utf8')) || [];
        fileArr.push(record);
        await fs.writeFile(submissionsFile, JSON.stringify(fileArr, null, 2), 'utf8');
    } catch (e) {
        console.error('failed to persist submission', e);
    }
    console.log('[form/submit] received', record.id);
    // After successful submission, destroy the user's session to auto-logout
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('session destroy error after submit', err);
                // still return success but indicate logout failed
                return res.json({ success: true, id, loggedOut: false });
            }
            return res.json({ success: true, id, loggedOut: true });
        });
    } else {
        return res.json({ success: true, id, loggedOut: false });
    }
});

app.get('/form/submissions', requireAuth, async (req: Request, res: Response) => {
    try {
        const raw = await fs.readFile(submissionsFile, 'utf8');
        const arr = JSON.parse(raw);
        return res.json(arr);
    } catch (e) {
        return res.json(submittedForms);
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
