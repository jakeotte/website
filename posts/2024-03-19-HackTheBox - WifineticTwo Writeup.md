# HackTheBox - WifineticTwo Writeup

![wifinetic two](assets/img/wifinetictwo.png)
*WifineticTwo on HackTheBox*

WifineticTwo is the latest box in Season 4 on HackTheBox and a sequel to Wifinetic. It's a Medium-Easy box which focuses on wireless networking. As a note - I had to restart the box a couple of times between screenshots, so hostnames and working directories might change.

## Foothold / User

Starting with an nmap scan:

Navigating to port 8080 reveals an "OpenPLC" Webserver login page:

![OpenPLC Login](assets/img/1.webp)
*OpenPLC login page*

A quick google search turns up the default credentials of openplc:openplc which can be used to login to the site.

![wifinetic two](assets/img/2.webp)
_wifinetic two_

Exploring the program, we appear to be able to upload PLC scripts and make hardware configurations. Another Google search reveals an authenticated RCE exploit.However, attempting to use it off-the-shelf doesn't seem to work:

![wifinetic two](assets/img/3.webp)
_wifinetic two_

At this point I took a look at the exploit code and added in an HTTP proxy to see the traffic it was sending through Burp. The exploit seems to be three steps, starting with a PLC script upload:

![wifinetic two](assets/img/5.webp)
_wifinetic two_

Then following up with some kind of hardware update in C to trigger a reverse shell on "updateCustomOut()":

![wifinetic two](assets/img/6.webp)
_wifinetic two_
![wifinetic two](assets/img/7.webp)
_wifinetic two_

Then finally just triggering the PLC server to start. At this point I spent some time manually looking around the application to figure out how to trigger all these requests myself. When I tried to compile the uploaded files and hardware updates from the exploit, I received this error:

![wifinetic two](assets/img/8.webp)
_wifinetic two_

Seeing this, I tried to just do the exploit steps manually by creating a PLC program file with the exploit's request content, configuring the hardware, compiling both and then starting the server:

![wifinetic two](assets/img/9.webp)
_wifinetic two_
![wifinetic two](assets/img/10.webp)
_wifinetic two_
![wifinetic two](assets/img/11.webp)
_wifinetic two_

Navigating back to the dashboard and clicking "Start PLC", we receive a root shell connection on our listener. We can find the user.txt flag in /root:

![wifinetic two](assets/img/12.webp)
_wifinetic two_

## Root

Before using any automated tools, I ran some situational awareness commands and noticed that the host seemed to have a wireless network adapter wlan0:

![wifinetic two](assets/img/13.webp)
_wifinetic two_

Considering the box is named "WifineticTwo", I figured this could be worth investigating. Although the interface state is DOWN, this is just because the interface is not actively connected to a wireless network. We can confirm this by using 'sudo ifconfig wlan0 up'.

We now need to search for a wireless network to connect to. There are many ways to do this, but a great tool to automate this and the coming steps is OneShot. I highly recommend it for any wireless testing.

With oneshot, we specify the wireless adapter interface and discover a nearby ESSID of "plcrouter":

![wifinetic two](assets/img/14.webp)
_wifinetic two_

We can then perform a WPS Pixie Dust attack by specifying our target as 1, and discover the both the WPS PIN of 12345670 and the WPA2 PSK to be "NoWWEDoKnowWhaTisReal123!":

![wifinetic two](assets/img/15.webp)
_wifinetic two_

Next we will need to connect to the wireless network. This step took me a fairly long time to find a working solution, as most revolved around using dhclient to request an IP from the SSID, which never seemed to work.

Eventually I found this article which uses systemd instead of dhclient for DHCP. I was able to successfully connect to the network and have DHCP be specified as a service parameter:

![wifinetic two](assets/img/16.webp)
_wifinetic two_
![wifinetic two](assets/img/17.webp)
_wifinetic two_


Doing a quick ping sweep we find only one other host 192.168.1.1. We also discover that SSH is available on the host. Logging in as root works with no password, and we find the root.txt flag!

![wifinetic two](assets/img/18.webp)
_wifinetic two_
![wifinetic two](assets/img/19.webp)
_wifinetic two_

Overall a very fun box! Wireless networks are not a frequent topic for CTFs, especially on HackTheBox, so this was a fun one. Learned a lot!
