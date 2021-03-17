## ⚠⚠⚠ BIG SCARY DISCLAIMER ⚠⚠⚠

The source code is here to allow you to contribute to development and (perhaps) to learn. It's **NOT** for making
unauthorised bots. Ask osk for permission before connecting to TETR.IO with anything other than the official client.

**You will be banned from the game if you don't follow the rules. It's not my fault if that happens.**

---

# Autohost for TETR.IO

A bot for osk's TETR.IO that allows for the following additional features in custom games:

* Automatic game starts
* Participation requirements:
    * Minimum / maximum rank
    * Minimum level
* Room bans
* Custom game presets

This is built on a custom Ribbon implementation in Node.js.

Currently it's full of bugs. I know. I'll fix them at some point.

## Commands

|Command|Arguments|Host Only?|Description|
|---|---|---|---|
|!autostart|`<time in seconds>`|Yes|Set the autostart timer, to automatically start the game when enough players are ready.|
|!ban|`<username>`|Yes|Bans a player from the lobby for the remainder of the session.|
|!cancelstart| |Yes|Cancels a pending autostart.|
|!help| |No|Shows the help message.|
|!hostmode| |Yes|Toggles host mode. This temporarily gives you control over the room to change any settings you want.|
|!kick|`<username>`|Yes|Kicks a player from the lobby.|
|!preset|`<preset name>`|Yes|Sets a preset for the game. Type `!preset` without any arguments to see a list.|
|!rules| |No|Shows the current participation rules.|
|!sethost|`<username>`|Yes|Transfer host privileges to another player.|
|!setrule|`<rule> <value>`|Yes|Sets a participation rule. Type `!setrule` without any arguments to see a list.|
|!sip| |No|:serikasip:|
|!start| |Yes|Starts the game.|
|!unset|`<rule>`|Yes|Unsets a participation rule.|