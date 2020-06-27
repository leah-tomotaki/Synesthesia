import sys
import json
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import cv2
from collections import Counter

# %matplotlib inline
def RGB2HEX(color):
    return "#{:02x}{:02x}{:02x}".format(int(color[0]), int(color[1]), int(color[2]))

def RGB2HSV(r, g, b):
    # R, G, B values are divided by 255
    # to change the range from 0..255 to 0..1:
    r, g, b = r / 255.0, g / 255.0, b / 255.0

    # h, s, v = hue, saturation, value
    cmax = max(r, g, b)  # maximum of r, g, b
    cmin = min(r, g, b)  # minimum of r, g, b
    diff = cmax - cmin  # diff of cmax and cmin.

    # if cmax and cmax are equal then h = 0
    if cmax == cmin:
        h = 0

    # if cmax equal r then compute h
    elif cmax == r:
        h = (60 * ((g - b) / diff) + 360) % 360

    # if cmax equal g then compute h
    elif cmax == g:
        h = (60 * ((b - r) / diff) + 120) % 360

    # if cmax equal b then compute h
    elif cmax == b:
        h = (60 * ((r - g) / diff) + 240) % 360

    # if cmax equal zero
    if cmax == 0:
        s = 0
    else:
        s = (diff / cmax) * 100

    # compute v
    v = cmax * 100
    return (h,s,v)


def get_image(image_path):
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image


def get_colors(image, num_colors, show_chart=False):
    modified_image = cv2.resize(image, (100, 100), interpolation=cv2.INTER_AREA)
    modified_image = modified_image.reshape(modified_image.shape[0] * modified_image.shape[1], 3)

    clf = KMeans(n_clusters=num_colors)
    labels = clf.fit_predict(modified_image)

    counts = Counter(labels)

    center_colors = clf.cluster_centers_
    # We get ordered colors by iterating through the keys
    ordered_colors = [center_colors[i] for i in counts.keys()]
    hex_colors = [RGB2HEX(ordered_colors[i]) for i in counts.keys()]
    # rgb_colors = [ordered_colors[i] for i in counts.keys()]
    hsv_colors = [RGB2HSV(ordered_colors[i][0], ordered_colors[i][1], ordered_colors[i][2]) for i in counts.keys()]
    # print(hsv_colors)
    if (show_chart):
        plt.figure(figsize=(8, 6))
        plt.pie(counts.values(), labels=hex_colors, colors=hex_colors)
    return hsv_colors


COLORS = {
    'RED': (((0, 51, 30), (20, 100, 100)), ((346, 51, 30), (360, 100, 100))),
    'ORANGE': ((21, 30, 30), (45, 100, 100)),
    'YELLOW': ((46, 30, 30), (65, 100, 100)),
    'GREEN': ((66, 30, 30), (175, 100, 100)),
    'BLUE': ((176, 30, 30), (275, 100, 100)),
    'PURPLE': ((276, 30, 30), (310, 100, 100)),
    'PINK': (((311, 30, 30), (345, 100, 100)), ((0, 30, 76), (20, 50, 100)), ((346, 51, 76), (360, 100, 100))),
    'GREY': ((0, 0, 26), (360, 30, 94)),
    'BLACK': ((0, 0, 0), (360, 100, 25)),
    'WHITE': ((0, 0, 95), (360, 5, 100)),
}

def is_color(hsv_color, selected_color_name):
    selected_color = COLORS.get(selected_color_name)
    print(hsv_color)
    if selected_color_name == 'RED' or selected_color_name == 'PINK':
        for i in range(len(selected_color)):
            if selected_color[i][0][0] <= hsv_color[0] <= selected_color[i][1][0] or selected_color[i][0][0] <= hsv_color[0] <= selected_color[i][1][0]:
                if selected_color[i][0][1] <= hsv_color[1] <= selected_color[i][1][1] and selected_color[i][0][2] <= hsv_color[2] <= selected_color[i][1][2]:
                    return True
    elif selected_color_name =='GREY':
        if selected_color[0][1] <= hsv_color[1] <= selected_color[1][1] and selected_color[0][1] <= hsv_color[1] <= selected_color[1][1]:
            if 40 <= hsv_color[1] + hsv_color[2] <= 67:
                return True
    elif selected_color[0][0] <= hsv_color[0] <= selected_color[1][0]:
        print(hsv_color[1] + hsv_color[2])
        if selected_color_name != 'BLACK' and selected_color_name != 'WHITE':
            if hsv_color[1] + hsv_color[2] > 85:
                return True
        if selected_color[0][1] <= hsv_color[1] <= selected_color[1][1] and selected_color[0][2] <= hsv_color[2] <= selected_color[1][2]:
            return True
    return False

def has_color(image_path, selected_color_name, num_colors=4):
    image = get_image(image_path)
    image_colors = get_colors(image, num_colors)
    for color in image_colors:
        if is_color(color, selected_color_name):
            return True
    return False


def get_covers(image_paths, selected_color_name, num_tracks=10):
    tracks_count = 0
    selected_tracks = []
    for i in range(len(image_paths)):
        if has_color(image_paths[i], selected_color_name):
            selected_tracks.append(i)
            tracks_count += 1
            if tracks_count >= num_tracks:
                break
    return selected_tracks


tracks = json.loads(sys.argv[1])
selected_color_name = sys.argv[2]
num_tracks = sys.argv[3]

image_paths = []
for track in tracks:
    image_paths.append(track['album']['images'][0]['url'])

print(get_covers(image_paths, selected_color_name, num_tracks))
