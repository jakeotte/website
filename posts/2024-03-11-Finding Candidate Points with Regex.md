# Finding Candidate Points with Regex

## Candidate Points

In white-box penetration testing and source code review, "candidate points" are functions or endpoints that represent possible vectors of attack for malicious user input. An example may be a "search.php" page which processes a "search" parameter via a SQL query, and returns the results:

```php
<?php

$query = $_REQUEST['search'];
$result = mysql_query("SELECT * FROM users WHERE name LIKE '%". $query . "%'");

while($row = mysql_fetch_array($result)){
			
echo "<p><h3>".$results['name']."</h3>".$results['bio']."</p>";

}
?>
```

Clearly, this function is vulnerable to SQL injection. But how would we be able to locate this search.php page and associated query in a codebase with thousands of lines of code?

## Basic Searches

Regular expressions (regex henceforth) are powerful tools for whitebox penetration testers and application security engineers. "Finding vulnerabilities" in a sprawling and complex application can be a daunting task.

Just as with any penetration test, the first thing we need to do is enumerate and get a foothold. Depending on the nature of your assignment, the definition of 'foothold' may change, but there are a few key enumeration points that can always help you.

Assuming we are testing a web application, let's try to find a list of all endpoints accessible by unauthenticated users. The way we approach this will change heavily based on our codebase language and structure. 

Let's start with a simple search of a codebase using  only PHP files with some HTML and JavaScript. In standard PHP web apps, a PHPSESSID cookie is assigned to each user session. The state of the session is maintained by manipulating properties of the user's session object. Consider the following login.php example file:

```php
<?php
$username = $_USERNAME['username'];
$password = $_REQUEST['password'];
$username = mysql_real_escape_string_quote($username);
$password = mysql_real_escape_string_quote($password);

$result = mysql_query("SELECT password FROM users WHERE name LIKE '%". $username . "%'");

if ($password === $result['password'])
{
     $_SESSION['user'] = $username;
     $_SESSION['authenticated'] = True;
}else{
     echo "Login failed.";
}
?>
```

The session object is serialized and stored on disk as a PHP session file. Now that we understand how sessions are used, let's get searching.

A place to start our search is all files that simply don't reference the session object at all:

`grep -l -r -v '$_SESSION' > nosession_endpoints`

Of course, this isn't ideal. If our previous login.php example was vulnerable to SQL injection, we would have missed it! 

## Unauthenticated Access with Regex

We will need to turn to regex for more nuanced files. Consider the following ticket.php file that allows users to create a help ticket:

```php
<?php

$ticketno = $_REQUEST['ticketno'];
$ticketbody = $_REQUEST['message'];
$attachment = $_FILES['attachment'];

if ($_SESSION['authenticated'] === True)
{
     $upload = "uploads/" . $_SESSION['user'] . 
     "/" . $ticketno . "/" . 
     $attachment["name"];
     move_uploaded_file($attachment,    
     $upload);
}else{
     $upload = "uploads/guest/" .$ticketno .   
     "/" . $attachment["name"];
     move_uploaded_file($attachment,    
     $upload);
     echo "You must be logged in to create a    
     ticket!";
}

?>
```

Our previous search would have missed this unauthenticated file upload vulnerability! Clearly we need a more cohesive search query. Let's try the search again:

`grep -l -r 'if.+\$\_SESSION\["authenticated"\] === True[\s\S]+else[\s\S]+\}' > unauth_endpoints`

Viewing our code snipped with this regex applied returns:

```php
if ($_SESSION['authenticated'] === True)
{
     $upload = "uploads/" . $_SESSION['user'] . 
     "/" . $ticketno . "/" . 
     $attachment["name"];
     move_uploaded_file($attachment,    
     $upload);
}else{
     $upload = "uploads/guest/" .$ticketno .   
     "/" . $attachment["name"];
     move_uploaded_file($attachment,    
     $upload);
     echo "You must be logged in to create a    
     ticket!";
}
```

Using this on the entire codebase will give us a list of functions that check for authenticated status with this specific regex, but have an else branch worth investigating. This is likely to return a lot of results, so we could filter further with additional grep statements looking for things like SQL queries.

## SQL Queries

The previous example was fairly basic, and likely to have the unfortunate combination of a lot of results and few interesting endpoints. However, creating a list of endpoints accessible by unauthenticated users is important as a resource for cross referencing other possible vulnerabilities. Finding a SQL injection on the admin panel page, while a concern, is not as valuable as one on the user registration page.

Let's look for some endpoints that generate SQL queries and before checking if they are in our unauthenticated list. A good place to start is finding SELECT, INSERT, or UPDATE queries that concatenate strings:

`grep -l -r '(SELECT|UPDATE|INSERT).+?\./i' > sql_endpoints`

The query looks to find a keyword in our list (case-insensitive) with a period following somewhere after. It's important to recognize that this only finds single-line SQL queries, and we may miss some, although it is unlikely.

At this point we should cross-reference our found list of endpoints with the unauthenticated list, and do a deep dive on each query to see how it's constructed. 

`grep -Ff unauth_endpoints sql_endpoints`

However, in the case that our application is exceptionally large, we can narrow the search further with a variety of methods. The method we select should be the result of analyzing any sanitization techniques present in the code. For example, we could search for files that don't include the mysql_real_escape_string_quote() function:

`grep -r -n '(SELECT|UPDATE|INSERT).+?\./i' | grep -v 'mysql_real_escape_string_quote' > noescape_endpoints`

Note that some formatting, cutting, and sort-fu will be necessary to the actual list of new endpoints, but it can be done fairly quickly.

## Python Decorators

Python web application frameworks like Frappe often use decorators for mapping HTTP requests to functions:

```python
@frappe.whitelist(allow_guest=True)
def logout():
	frappe.local.login_manager.logout()
	frappe.db.commit()

@frappe.whitelist(allow_guest=True)
def web_logout():
	frappe.local.login_manager.logout()
	frappe.db.commit()
	frappe.respond_as_web_page(
		_("Logged Out"), _("You have been successfully logged out"), indicator_color="green"
	)

A handy regex for extracting the contents of multi-line functions between specific decorators I use is:

grep -l '(?<=\@frappe\.whitelist\(allow\_guest=True\)\n)[\s\S]+?(?=\@frappe\.whitelist)'

This regex will extract each function with the specified decorators without including them:

def logout():
	frappe.local.login_manager.logout()
	frappe.db.commit()

def web_logout():
	frappe.local.login_manager.logout()
	frappe.db.commit()
	frappe.respond_as_web_page(
		_("Logged Out"), _("You have been successfully logged out"), indicator_color="green"
	)
```

These can then be pretty easily grepped further for stuff like SQL queries.

## Conclusion

There is TONS more to regex optimization for finding vulnerabilities, but I had fun working with this on a project and wanted to share a little bit. I may make a more in-depth guide in the future, we'll see
