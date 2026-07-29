import re, shutil, sys

conf = '/etc/nginx/sites-enabled/animalwellness'
shutil.copy(conf, conf + '.bak')

content = open(conf).read()

block = """
    location = /robots.txt {
        root /var/www/animalwellness/animal-nes/public;
        add_header Cache-Control "public, max-age=3600";
        access_log off;
    }

"""

if 'location = /robots.txt' in content:
    print('robots.txt block already exists — nothing to do.')
    sys.exit(0)

new = content.replace('    location / {', block + '    location / {', 1)

if new == content:
    print('ERROR: could not find insertion point. Check the config manually.')
    sys.exit(1)

open(conf, 'w').write(new)
print('Done. Backup saved to', conf + '.bak')
