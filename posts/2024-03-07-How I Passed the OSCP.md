# How I Passed the OSCP

![OSCP Certificate](assets/img/cert.png)
*My Certificate*

## Introduction

In September of 2023, I decided I wanted to change careers to cybersecurity. I started off with some fundamentals by getting my Network+ and Security+ certifications from CompTIA, but quickly discovered my passion was in the offensive space. When you decide to get into offensive, it will probably be under a minute or two before someone tells you to get your OSCP. It is the keynote certification for entry-level offensive professionals offered by the company OffSec. This is my experience with studying for, taking, and eventually passing the OSCP starting from absolutely nothing. It has been a very long and windy road, much more than I expected, but it can be done.

## Starting out

I graduated from university with a physics degree in early 2023. When I decided I wanted to get into cybersecurity in September, I had literally zero prior experience. I had some exposure to coding and (very) small Python projects, but did not know how networking worked or what ports were.

I realized pretty early on that I need to figure out what is happening under the hood of a network if I have any chance of hacking it. My first step was to study for the CompTIA Network+ exam and take it. I cannot endorse this cert enough - if you are new to cyber, IT, or any kind of networking, please give this one a look! The knowledge you get from studying for this exam will help you in countless ways once you get into security.

Next I took the Security+ exam. The certification is fairly easy and the content is OK. Most companies really like it though, so I would also recommend getting this first. It will help give you an idea of what terms like Pass-the-Hash mean before you starting hearing them constantly.

I passed Network+ at the end of October and Security+ a week later. Afterwards, I took around two weeks to just get my bearings with Kali Linux and understand how to use common tools like BurpSuite. I used this book, and I cannot recommend it enough. While learning about tools and Linux, I also practiced actually using them by working through HackTheBox's Starting Point labs. This was an invaluable learning period, and I highly suggest doing something similar before even enrolling in the OSCP course.

## The OSCP Course and My Decision

After finishing HTB's Starting Point, I bought the Learn One access package for the OSCP course. I opted for this instead of the typical 90 day package as I was admittedly nervous about learning so much in such short time. I don't regret this, but for very different reasons that I will discuss soon.

Immediately upon starting the course, I was very underwhelmed. Although I was learning about types of attacks, I didn't feel like I was practicing them enough or developing as an independent attacker. 

It was also around this time that I started doing a bit more HackTheBox. I was terrible, so I spent a lot of time in the community Discord asking for hints or clarification. Some of the members in the Discord encouraged me to check out HackTheBox's Academy site to learn a bit more about a topic. After visiting the site, I realized that it had everything I was looking for. Detailed discussions of specific attack vectors, challenge questions for each, and recommended machines on the main platform to try after each lesson. I was immediately hooked, and essentially stopped using the OSCP course entirely.

After a while on Academy, I realized that HackTheBox had their own version of the OSCP, called the CPTS, which came with its own course. Seeing as I enjoyed the Academy content thoroughly so far, I decided to enroll in the CPTS course and complete it entirely. I cannot stress enough that this was a big change in commitment for me. My timeline essentially went from having the OSCP done in a few months to god knows when, but I felt that there was simply more to learn from the CPTS path.

## CPTS Course

The first thing to note about the CPTS course is that it is quite long. The 'recommended' completion time is 43 days. I finished CPTS in around 45-50 days, and I admittedly sped through some less interesting modules. 

The content of this course is absolutely top notch, except for a few infamous outliers like the Thick Client attacks. The information contained within each module was absolutely miles better than what is contained in the OSCP. The 45-50 days I spent thanklessly grinding through the course was incredibly fulfilling. In two months I went from having no idea how to use Linux to being able to do some medium HackTheBox machines entirely on my own. 

After finishing my CPTS course, I was of course very excited to take the exam, and signed up for the next week's Thursday, as I had next Friday off from work. Reality would soon hit.

## A Reality Check

During my time studying for the OSCP and CPTS, I had been applying to some security jobs. I had a few interviews for SOC work, but the pay cuts were a deal breaker. Luckily for me, I had somehow landed an interview for an offensive position at a well-known company for the following Friday, a day after I was slated to start my CPTS exam.

The next Thursday rolls around and I begin my CPTS exam. I didn't make a lot of progress, but felt good about my enumeration and thought I was in a good spot. The average foothold time is around 3 days, so I was still doing alright.

The next morning I poke around the exam environment a bit more before joining my video call interview. The interview goes quite well, up until the point that the reviewer looks over my certifications.

The reviewer asks - "When are you going to get your OSCP?" I say that while I haven't acquired it yet, I am actually pursuing an arguably much more difficult and comprehensive certification with HackTheBox called CPTS or blah blah blah. The reviewer didn't care. At all. The interview ended abruptly a few minutes later after they said "Email me when you earn your OSCP."

I was pretty upset. What the hell was I doing spending 10, possibly 20 days nearly 10 hours a day getting a certification that isn't going to get me a job?

Shortly after this, I made the decision to immediately book my OSCP exam for two weeks from that day and stop working on my CPTS.

I would like to say that I still think the CPTS is easily a more comprehensive certification and a better indicator of skill as a penetration tester. I am absolutely not criticizing those who got their CPTS - they deserve respect for conquering a beast of an exam! But sometimes practicality needs to come first.

## Preparing for the Exam

I decided to devote myself entirely to preparing for the OSCP exam in the two weeks I had. The first and arguably most important step was to secure the bonus points available in the course. All you need to do is complete each course section's lab up to an 80% score, and submit 30 proof.txt files from the course CHALLENGE LABS (NOT proving grounds. I made that mistake...). 

The course labs were fairly trivial to complete. The challenge labs were an interesting introduction to 'OffSec' style CTF content. I have to say that while I found them a bit clunky at times, they are a legitimately good way of preparing for the exam.

After getting my bonus points, I spent the next 10 or so days tirelessly grinding HackTheBox machines and Proving Grounds machines from TJNull's list.

Overall, the list is good. It will get you practice in relevant areas of the exam - especially the Proving Grounds boxes. That being said, some of the recommendations are hilariously overkill for the OSCP, and may just lead to frustration for newer students.

For example, I found it pretty hilarious that the Marshalled Proving Grounds box is on the list. There is absolutely no shot you get a box on the OSCP that you need to make your own serialized payloads. Fun to learn about, but entirely unnecessary.

If your weak point is AD, I can't recommend doing Flight and Escape from HackTheBox enough. Great machines.

## The Exam

I had prepared for two weeks now - bonus points acquired, countless machines done. I was pretty confident. Unfortunately, my exam time was set to start at 8 PM. I decided I wasn't going to stay up all night. Instead I would just do what I could until midnight or 1 AM and then go to sleep, finishing tomorrow.

The exam was not hard. I finished in about 3-4 hours. I am not bragging here - I want to emphasize that if you prepared the way I did, and took the time to work through the CPTS course, you will face minimal resistance in this exam. I went to bed, woke up the next day, and spent 2/3 hours throwing together my report before submitting. I had confirmation of passing by the end of the day (incredibly fast).

## Beyond OSCP

I didn't feel like I proved much after getting my OSCP, to be honest. It has been a long journey towards it, but I abandoned my original mission of the CPTS. I may return to it eventually, but it is incredibly difficult to justify. The CPTS exam is an escapade lasting nearly a month, is incredibly difficult, and is hardly a recognizable title in the industry. I love HackTheBox, but I have opted to sign up for the OSWE course. I have enjoyed it so far, and found the content to be significantly better quality than the OSCP. I will write a post about my experience studying for it in a few months.

If you are taking your OSCP - you can do it!
