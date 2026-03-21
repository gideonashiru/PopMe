# PopMe

PopMe is a playful to‑do app where tasks live as floating bubbles instead of a list. Priority controls bubble size, energy controls bubble color, and tasks gently hover to feel alive. There’s a soft “add task” bubble at the bottom, an edit modal with live preview, and recent tasks you can restore later.

![PopMe App](/popme.PNG)

## What it does

- Create tasks from a bottom “add task” bubble
- Tasks appear as floating bubbles on the home screen
- Size = priority, color = energy
- Tap to select, double‑tap to edit
- Edit modal with live preview, sliders, due date, and subtasks
- Long‑press a bubble to pop/delete it (with sound + haptic)
- Recent Tasks screen to restore deleted items

## Requirements

- Node.js 18+ recommended
- Expo CLI (installed automatically via `npx expo`)

## Installation

Run the following commands in command prompt

```bash
npm install

expo install expo-linear-gradient expo-blur expo-av @react-native-community/slider @react-native-community/datetimepicker
```

## Run

To run the project, open command prompt and navigate to the project folder. You can grab the project address by opening the folder in your file explorer, right clicking on the address at the top, and clicking "Copy Address"

```bash
cd <ADDRESS>
```

Then, start up the application with the following command
```bash
npx expo start --tunnel
```

Then open with:
- Website: press 'w'
- Physical device: scan the QR code with Expo Go

## Project layout

```
app/                   Screens and routes (Expo Router)
components/            Reusable UI pieces (bubbles, modal, input)
data/                  Sample task data
store/                 Local state (tasks context)
types/                 Type definitions
utils/                 Helpers (bubble sizing, dates, layout, haptics)
assets/sounds/         Pop sound
```

## Notes

- Data is stored in local state for now. The structure is ready for AsyncStorage or a backend later.
- The add‑task bubble is a button that opens a name prompt instead of typing inline.

## License

MIT

## more installations
npx expo install \
  expo-blur \
  expo-linear-gradient \
  expo-av \
  expo-haptics \
  expo-image \
  @react-native-community/slider \
  @react-native-community/datetimepicker \
  @react-native-async-storage/async-storage \
  lucide-react-native \
  react-native-svg \
  matter-js \
  @types/matter-js