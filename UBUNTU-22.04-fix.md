1. Stop the failing service
```bash
systemctl stop srvpanel.service
````

2. Obliterate the broken folder and cache
We need to completely delete the bad files so npm is forced to start from scratch:

```bash
cd /opt/srvpanel/backend
rm -rf node_modules package-lock.json
npm cache clean --force
```

3. Install fresh and force local compilation
Instead of using flags that modern npm complains about, we will pass a temporary environment variable (npm_config_build_from_source=true). This tells npm: "Do not download a prebuilt binary. Compile SQLite right here on this server using Ubuntu 22.04's tools."

```bash
npm_config_build_from_source=true npm install
```
(Give this a minute or two to finish, as you will see it compiling the code using the build-essential tools we installed earlier).

4. Reset and Start the Backend
Now that the freshly compiled, compatible binary is sitting in your folder, clear systemd's error state and turn the service back on:

```bash
systemctl reset-failed srvpanel.service
systemctl start srvpanel.service
```

5. Check your work

```bash
systemctl status srvpanel.service
```
