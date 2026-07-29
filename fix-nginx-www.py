import sys

conf = '/etc/nginx/sites-enabled/animalwellness'
content = open(conf).read()

# The main HTTPS server block has both hostnames — remove www from it
# so www requests always go to the dedicated redirect block
old = 'server_name animalwellness.shop www.animalwellness.shop;\n\n    ssl_certificate /etc/letsencrypt'
new = 'server_name animalwellness.shop;\n\n    ssl_certificate /etc/letsencrypt'

if old not in content:
    print('ERROR: could not find the target line. Config may already be fixed or has changed.')
    sys.exit(1)

open(conf, 'w').write(content.replace(old, new, 1))
print('Done. www.animalwellness.shop removed from main server block.')
print('Run: sudo nginx -t && sudo systemctl reload nginx')
