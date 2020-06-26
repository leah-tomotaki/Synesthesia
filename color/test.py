import json
import sys

tracks = json.loads(sys.argv[1])
selected_color_name = sys.argv[2]
num_tracks = sys.argv[3]

image_paths = []
for track in tracks:
    image_paths.append(track['album']['images'][0]['url'])

print('Test Script is working')
print(image_paths)
print('color:', selected_color_name)
print('number of tracks:', num_tracks)