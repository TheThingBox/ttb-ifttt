[![License](https://img.shields.io/badge/license-WTFPL-blue.svg)](http://www.wtfpl.net/)
![GitHub issues](https://img.shields.io/github/issues-raw/thethingbox/ttb-ifttt.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/thethingbox/ttb-ifttt.svg)

# ttb-ifttt

This node allow the user to use the channel Maker's trigger of IFTTT.

# Usages

<p>Provides a node for making an <a href="https://ifttt.com/" target="_new">IFTTT</a> Trigger.</p>
<p>The event generate by the node can have three optional values define by <code>value 1</code>, <code>value 2</code> and <code>value 3</code> :</p>
<ul>
    <li><code>event</code>, have to be set without blankspaces</li>
    <li><code>secret key</code>, you can retieve your secret key <a href="https://ifttt.com/maker" target="_new">here</a> when you are logged in IFTTT.</li>
    <li><code>value 1, 2 & 3</code>, you can set values like this example :
        <ul>
            <li><code>value 1</code> : house-temperature</li>
            <li><code>value 2</code> : 25</li>
            <li><code>value 3</code> : 07-03-2015 14:25</li>
        </ul>
    </li>
</ul>
<p>All the information of this node can also be set by a function like that :</p>
<ul>
    <li><code>event</code> with <code>msg.event</code></li>
    <li><code>secret key</code> with <code>msg.secretkey</code></li>
    <li><code>value 1</code> with <code>msg.value1</code></li>
    <li><code>value 2</code> with <code>msg.value2</code></li>
    <li><code>value 3</code> with <code>msg.value3</code></li>
</ul>
