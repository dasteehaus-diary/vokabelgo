
// ==========================================================================
// KINO STUDIO V2: CLEAN & ROBUST JAVASCRIPT
// ==========================================================================
const PIZZASCHWESTER_72_SEGMENTS = [
  {
    "id": 1,
    "start": 27.73,
    "end": 32.8,
    "text": "Fertig! Okay. Klingel-klingel! Klingel-klingel!",
    "vi": "Xong rồi! Được rồi. Kính coong! Kính coong!"
  },
  {
    "id": 2,
    "start": 33.73,
    "end": 37.2,
    "text": "Hallo? Hier der Pizzaladen! Möchten Sie gerne eine Pizza bestellen?",
    "vi": "A lô? Tiệm pizza xin nghe! Quý khách muốn đặt một chiếc pizza chứ ạ?"
  },
  {
    "id": 3,
    "start": 37.25,
    "end": 40.8,
    "text": "Ja, bitte! Ich möchte eine Pizza Supreme ohne Pilze.",
    "vi": "Vâng, làm ơn! Tôi muốn một chiếc pizza Supreme không cho nấm."
  },
  {
    "id": 4,
    "start": 40.75,
    "end": 44.0,
    "text": "Möchten Sie auch Knoblauchbrot? Ja, ich nehme auch Knoblauchbrot.",
    "vi": "Quý khách có lấy thêm bánh mì bơ tỏi không? Vâng, tôi lấy cả bánh mì bơ tỏi nữa."
  },
  {
    "id": 5,
    "start": 43.95,
    "end": 47.4,
    "text": "Gut, alles klar! Wird nicht lange dauern!",
    "vi": "Tuyệt, rõ rồi ạ! Sẽ không lâu đâu!"
  },
  {
    "id": 6,
    "start": 47.35,
    "end": 51.2,
    "text": "Brauchen Sie meine Adresse? Nein, ich kann Sie ja sehen! Wiederhören!",
    "vi": "Quý khách có cần địa chỉ của tôi không? Không, tôi nhìn thấy quý khách mà! Chào tạm biệt!"
  },
  {
    "id": 7,
    "start": 51.25,
    "end": 56.8,
    "text": "Wir brauchen eine Pizza Supreme, bitte, Pizzatante. Oh, aber ohne Pilze. Okay!",
    "vi": "Bọn cháu cần một chiếc pizza Supreme, làm ơn, cô làm pizza ơi. Ồ, nhưng không có nấm nhé. Được rồi!"
  },
  {
    "id": 8,
    "start": 56.85,
    "end": 60.8,
    "text": "Ich mach das Knoblauchbrot! Können wir so tun, als ob wir Schwestern sind, und der Pizzaladen unserer Mum gehört?",
    "vi": "Chị sẽ làm bánh mì bơ tỏi! Chúng mình có thể giả vờ như hai chị em, và tiệm pizza này là của mẹ không?"
  },
  {
    "id": 9,
    "start": 60.85,
    "end": 66.0,
    "text": "Oh ja, und wir schmeißen den Pizzaladen für sie, damit sie in den Urlaub fliegen kann. Ja! Nach Italien!",
    "vi": "Ồ được chứ, và chúng mình quán xuyến tiệm pizza giúp mẹ, để mẹ có thể đi máy bay đi nghỉ dưỡng. Vâng! Đến Ý!"
  },
  {
    "id": 10,
    "start": 72.05,
    "end": 75.8,
    "text": "Das Knoblauchbrot ist fertig. Klasse! Vergiss nicht das Freigetränk!",
    "vi": "Bánh mì bơ tỏi xong rồi. Tuyệt quá! Đừng quên nước ngọt tặng kèm đấy nhé!"
  },
  {
    "id": 11,
    "start": 76.85,
    "end": 79.6,
    "text": "Danke, Pizzaschwester! Bis nachher!",
    "vi": "Cảm ơn chị gái pizza! Hẹn lát nữa gặp lại!"
  },
  {
    "id": 12,
    "start": 85.85,
    "end": 90.2,
    "text": "Ich bin schon da! Oh, sehr schön! Es sind keine Pilze drauf?",
    "vi": "Tôi đến nơi rồi đây! Ồ, tuyệt quá! Trên bánh không có nấm chứ?"
  },
  {
    "id": 13,
    "start": 90.15,
    "end": 93.5,
    "text": "Nein, keine Pilze. Sehr gut.",
    "vi": "Không, không có nấm đâu. Tốt lắm."
  },
  {
    "id": 14,
    "start": 93.45,
    "end": 97.2,
    "text": "Nein, nein, den Karton können Sie nicht haben. Das ist unser einziger.",
    "vi": "Không, không, quý khách không thể lấy hộp các-tông này đâu. Đó là cái duy nhất của chúng tôi đấy."
  },
  {
    "id": 15,
    "start": 97.25,
    "end": 102.2,
    "text": "Gut... was mache ich denn jetzt? Nehmen Sie einfach nur die Pizza. Äh, okay.",
    "vi": "Được rồi... vậy bây giờ tôi làm sao đây? Quý khách cứ cầm lấy bánh pizza thôi. À, được rồi."
  },
  {
    "id": 16,
    "start": 103.65,
    "end": 106.8,
    "text": "Danke, Wiedersehen! Oh Mann!",
    "vi": "Cảm ơn, chào tạm biệt! Trời đất ơi!"
  },
  {
    "id": 17,
    "start": 107.35,
    "end": 112.0,
    "text": "Ich bin wieder da, Pizzaschwester! Oh nein, nicht schon wieder. Oh, ich kann's reparieren!",
    "vi": "Chị về rồi đây, em gái pizza! Ôi không, lại nữa rồi à. Ồ, chị sửa được mà!"
  },
  {
    "id": 18,
    "start": 112.05,
    "end": 117.2,
    "text": "Mum, kriegen wir ein neues Auto? Oh... Aber das hast du bekommen, als du 2 Jahre alt warst.",
    "vi": "Mẹ ơi, chúng con có được chiếc xe mới không? Ồ... Nhưng con đã nhận chiếc xe đó từ khi mới 2 tuổi rồi mà."
  },
  {
    "id": 19,
    "start": 117.25,
    "end": 120.6,
    "text": "Aber das Rad fällt immer wieder ab! Ich weiß.",
    "vi": "Nhưng cái bánh xe cứ bị rơi ra suốt thôi! Mẹ biết rồi."
  },
  {
    "id": 20,
    "start": 120.55,
    "end": 124.5,
    "text": "Aber an dem Auto hängen doch so viele Erinnerungen. Wie können Erinnerungen an einem Auto hängen?",
    "vi": "Nhưng chiếc xe đó gắn liền với biết bao kỷ niệm mà. Làm sao kỷ niệm lại có thể gắn vào một chiếc xe được ạ?"
  },
  {
    "id": 21,
    "start": 124.55,
    "end": 129.8,
    "text": "Na ja... Fertig! Ah, na ist doch toll! Siehst du? So gut wie neu!",
    "vi": "Thôi nào... Xong rồi! A, chẳng phải rất tuyệt sao! Con thấy chưa? Tốt như mới luôn!"
  },
  {
    "id": 22,
    "start": 129.85,
    "end": 134.8,
    "text": "Ist mein Auto zerkratzt? Diese Folge von Bluey heißt: Pizzaschwestern.",
    "vi": "Xe của con có bị trầy xước không? Tập phim Bluey này có tên là: Hai chị em bán Pizza."
  },
  {
    "id": 23,
    "start": 135.05,
    "end": 138.5,
    "text": "Was ist das denn Cooles, Muffin? Das ist ein Elektroauto!",
    "vi": "Cái gì mà ngầu thế hả Muffin? Đó là một chiếc xe hơi điện đấy!"
  },
  {
    "id": 24,
    "start": 138.45,
    "end": 143.8,
    "text": "Mein Dad hat ein neues Auto gekauft, und das haben wir dazu gekriegt! Das kann ja sogar ohne Pedale fahren!",
    "vi": "Bố em vừa mua một chiếc ô tô mới, và bọn em được tặng kèm chiếc này đấy! Xe này thậm chí chạy không cần bàn đạp luôn!"
  },
  {
    "id": 25,
    "start": 143.85,
    "end": 147.5,
    "text": "Ja, und es ist sehr, sehr teuer. Also sei vorsichtig damit, Muffin.",
    "vi": "Ừ, và nó rất, rất đắt tiền đấy. Nên em phải cẩn thận với nó nhé, Muffin."
  },
  {
    "id": 26,
    "start": 147.45,
    "end": 150.8,
    "text": "Können wir damit Pizzaschwestern spielen? Okay! Hurra!",
    "vi": "Chúng mình có thể chơi trò hai chị em bán pizza với chiếc xe này không? Được thôi! Hoan hô!"
  },
  {
    "id": 27,
    "start": 152.65,
    "end": 156.4,
    "text": "Okay, wir sind drei Schwestern, die einen Pizzaladen haben. Ja, gut!",
    "vi": "Được rồi, chúng mình là ba chị em có một tiệm bánh pizza nhé. Ừ, hay đấy!"
  },
  {
    "id": 28,
    "start": 156.65,
    "end": 161.8,
    "text": "Hm... Da ist gar kein Dach, wo wir das Pizzaschild festmachen können. Das ist ja auch ein Cabriolet!",
    "vi": "Hừm... Ở đây chẳng có mui xe để chúng mình gắn biển hiệu pizza lên cả. Xe này là xe mui trần mà!"
  },
  {
    "id": 29,
    "start": 161.85,
    "end": 165.2,
    "text": "Okay, na ja, wir brauchen das Schild ja nicht unbedingt.",
    "vi": "Được rồi, ừ thì, chúng mình cũng không nhất thiết phải cần biển hiệu đâu."
  },
  {
    "id": 30,
    "start": 165.35,
    "end": 167.5,
    "text": "Hallo? Sind da die Kunden?",
    "vi": "A lô? Khách hàng có ở đó không ạ?"
  },
  {
    "id": 31,
    "start": 167.65,
    "end": 172.2,
    "text": "Und dann machst du mit dem Fuß nur so... und der Kofferraum geht auf! Oh, cool!",
    "vi": "Và sau đó em chỉ cần dùng chân làm thế này... là cốp xe tự mở ra luôn! Ồ, ngầu thật đấy!"
  },
  {
    "id": 32,
    "start": 172.35,
    "end": 175.5,
    "text": "Hallo, Kunden! Das Telefon funktioniert nicht.",
    "vi": "Xin chào khách hàng! Điện thoại không hoạt động rồi."
  },
  {
    "id": 33,
    "start": 175.55,
    "end": 179.8,
    "text": "Ich frag sie einfach. Warte, Muffin, nein! Wir müssen das telefonisch klären!",
    "vi": "Để em hỏi thẳng họ luôn. Đợi đã, Muffin, không được! Chúng ta phải giải quyết qua điện thoại chứ!"
  },
  {
    "id": 34,
    "start": 180.35,
    "end": 184.8,
    "text": "Sie wollen eine Supreme! Okay, eine Supreme! Danke, Pizzaschwester!",
    "vi": "Họ muốn một chiếc bánh Supreme! Được rồi, một chiếc Supreme! Cảm ơn em gái pizza!"
  },
  {
    "id": 35,
    "start": 185.05,
    "end": 191.5,
    "text": "Eigentlich gehört unserer Mum der Pizzaladen. Sie hat immer ganz hart gearbeitet, und deswegen wollen wir, dass sie in den Urlaub fliegen kann!",
    "vi": "Thực ra tiệm pizza này là của mẹ bọn mình. Mẹ luôn làm việc rất chăm chỉ, và vì thế bọn mình muốn mẹ được đi máy bay đi nghỉ dưỡng!"
  },
  {
    "id": 36,
    "start": 191.65,
    "end": 196.2,
    "text": "Wow, jetzt können wir die Pizza ja richtig schnell ausliefern! Halt!",
    "vi": "Oa, bây giờ chúng mình có thể đi giao pizza cực kỳ nhanh rồi! Dừng lại!"
  },
  {
    "id": 37,
    "start": 196.25,
    "end": 200.5,
    "text": "Aber ich leg doch nur die Pizza rein. Es darf doch kein Dreck in mein neues Auto kommen!",
    "vi": "Nhưng chị chỉ đặt bánh pizza vào thôi mà. Không được để một tí bụi bẩn nào dính vào xe mới của em đâu đấy!"
  },
  {
    "id": 38,
    "start": 200.45,
    "end": 204.2,
    "text": "Was? Wieso? Weil es unglaublich viel Geld kostet!",
    "vi": "Cái gì? Tại sao? Vì nó tốn nhiều tiền khủng khiếp luôn đấy!"
  },
  {
    "id": 39,
    "start": 204.25,
    "end": 209.0,
    "text": "Oh, okay... Und was machen wir da jetzt? Wir müssen dann eben was anderes spielen.",
    "vi": "Ồ, được rồi... Vậy bây giờ chúng mình làm gì đây? Vậy thì chúng mình đành phải chơi trò khác thôi."
  },
  {
    "id": 40,
    "start": 209.05,
    "end": 213.8,
    "text": "Oh... Was kann man denn noch damit spielen? Eigentlich fahre ich damit immer nur rum.",
    "vi": "Ồ... Thế còn trò gì có thể chơi với chiếc xe này nữa? Thực ra em chỉ toàn lái nó chạy vòng quanh thôi."
  },
  {
    "id": 41,
    "start": 213.85,
    "end": 218.5,
    "text": "Okay, dann machen wir das! Füße abtreten! 'Tschuldigung!",
    "vi": "Được rồi, vậy thì chúng mình làm thế nhé! Lau chân đi đã! Xin lỗi nhé!"
  },
  {
    "id": 42,
    "start": 218.45,
    "end": 222.5,
    "text": "Ich will kein Dreck im Auto haben! Wir sind so weit, Muffin, nhưng bitte fahr auf keinen Fall zu...",
    "vi": "Em không muốn có vết bẩn nào trong xe đâu! Bọn chị sẵn sàng rồi, Muffin, nhưng làm ơn đừng bao giờ lái xe quá..."
  },
  {
    "id": 43,
    "start": 223.85,
    "end": 238.0,
    "text": "Wuhuhu! Ich fahr lieber.",
    "vi": "Wuhuhu! Tôi thích lái xe hơn."
  },
  {
    "id": 44,
    "start": 242.65,
    "end": 246.8,
    "text": "Hey, gleich sind die weißen Pfotenabdrücke drauf! Gefällt's dir auch, Trixie?",
    "vi": "Này, sắp có dấu chân trắng in lên rồi đấy! Em cũng thích chứ, Trixie?"
  },
  {
    "id": 45,
    "start": 246.85,
    "end": 252.0,
    "text": "Ach... Ich vermisse das alte Auto. Damit haben wir die Kinder nach der Geburt nach Hause gefahren.",
    "vi": "Chao ôi... Em nhớ chiếc xe cũ quá. Chiếc xe mà chúng ta đã chở lũ trẻ từ viện về nhà sau khi sinh đấy."
  },
  {
    "id": 46,
    "start": 252.25,
    "end": 256.5,
    "text": "Das hat Spaß gemacht! Darf ich bitte auch mal fahren? Na gut.",
    "vi": "Vui thật đấy! Cho cháu xin phép được lái một lần với nhé? Thôi được rồi."
  },
  {
    "id": 47,
    "start": 256.55,
    "end": 260.5,
    "text": "Alles klar, und los geht's! Hä? Was ist denn jetzt los?",
    "vi": "Tất cả đã sẵn sàng, và xuất phát nào! Hả? Có chuyện gì xảy ra thế này?"
  },
  {
    "id": 48,
    "start": 260.65,
    "end": 265.8,
    "text": "Oh, der Akku ist alle. Oh... Wir müssen ihn aufladen! Dad!",
    "vi": "Ôi, hết pin rồi. Ôi... Chúng ta phải sạc pin cho nó thôi! Bố ơi!"
  },
  {
    "id": 49,
    "start": 267.35,
    "end": 270.5,
    "text": "Okay! Der Akku lädt jetzt, Kinder.",
    "vi": "Được rồi! Pin đang sạc rồi đấy các con."
  },
  {
    "id": 50,
    "start": 270.45,
    "end": 274.5,
    "text": "Und wie lange dauert das mit dem Aufladen? So lange... Oh.",
    "vi": "Và việc sạc pin này mất bao lâu ạ? Lâu lắm đấy... Ôi."
  },
  {
    "id": 51,
    "start": 274.55,
    "end": 281.2,
    "text": "Was wollen wir spielen, bis wir wieder fahren können? Wir können ja weiter Pizzaschwestern spielen! Ja!",
    "vi": "Chúng mình muốn chơi trò gì trong lúc chờ xe chạy lại được đây? Chúng mình có thể tiếp tục chơi hai chị em bán pizza mà! Đúng rồi!"
  },
  {
    "id": 52,
    "start": 281.35,
    "end": 286.2,
    "text": "Also, Sie wollen eine Pizza Supreme mit extra Ananasstückchen drauf haben, ja? Jep!",
    "vi": "Vậy là, quý khách muốn một chiếc pizza Supreme có thêm những miếng dứa bên trên, đúng không ạ? Đúng thế!"
  },
  {
    "id": 53,
    "start": 286.25,
    "end": 289.5,
    "text": "Aber ohne Pilze, das ist ganz wichtig! Geht klar!",
    "vi": "Nhưng không có nấm nhé, điều đó rất quan trọng đấy! Rõ rồi ạ!"
  },
  {
    "id": 54,
    "start": 289.45,
    "end": 293.0,
    "text": "Wenn Sie doch Pilze drauf machen, dann wird... Okay, Wiederhören!",
    "vi": "Nếu các cô mà cho nấm vào, thì sẽ... Được rồi, chào tạm biệt quý khách!"
  },
  {
    "id": 55,
    "start": 293.05,
    "end": 296.2,
    "text": "Los kommt, wir legen ihm Pilze drauf! Ja!",
    "vi": "Nào mọi người ơi, chúng mình cùng rải nấm lên cho chú ấy đi! Vâng!"
  },
  {
    "id": 56,
    "start": 296.35,
    "end": 301.8,
    "text": "Bluey, was kann ich denn machen? Na ja, mein Lieferauto muss dringend repariert werden.",
    "vi": "Bluey ơi, em có thể làm gì được nhỉ? À, xe giao hàng của chị cần được sửa gấp đấy."
  },
  {
    "id": 57,
    "start": 301.85,
    "end": 304.5,
    "text": "Du kannst der Mechaniker sein! Okay!",
    "vi": "Em có thể làm thợ sửa xe! Được luôn!"
  },
  {
    "id": 58,
    "start": 309.35,
    "end": 313.2,
    "text": "Fertig! Hier ist Ihre Pizza!",
    "vi": "Xong rồi! Pizza của quý khách đây ạ!"
  },
  {
    "id": 59,
    "start": 313.15,
    "end": 315.8,
    "text": "Oh, klasse! Hier ist das Geld.",
    "vi": "Ồ, tuyệt quá! Tiền đây nhé."
  },
  {
    "id": 60,
    "start": 315.85,
    "end": 319.8,
    "text": "Wow, extra Ananas! Hey, Augenblick, was ist das denn?",
    "vi": "Oa, thêm dứa này! Này, khoan đã, cái gì thế này?"
  },
  {
    "id": 61,
    "start": 319.85,
    "end": 323.8,
    "text": "Lassen Sie sich die Pilze schmecken! Was? Du kleines...",
    "vi": "Chúc quý khách ngon miệng với món nấm nhé! Cái gì cơ? Con nhóc này..."
  },
  {
    "id": 62,
    "start": 324.05,
    "end": 329.2,
    "text": "Nochmal! Okay, danke, bis dann!",
    "vi": "Một lần nữa nào! Được rồi, cảm ơn nhé, hẹn gặp lại!"
  },
  {
    "id": 63,
    "start": 329.85,
    "end": 337.2,
    "text": "Du meine Güte, die Kunden haben 10 Pizzen bestellt! Zehn?! Sie haben gesagt, sie machen eine Pizzaparty, und wir sollen uns ruhig Zeit lassen.",
    "vi": "Trời đất ơi, khách hàng đặt tận 10 chiếc pizza liền! Mười cái cơ á?! Họ nói rằng họ sẽ tổ chức một bữa tiệc pizza, và bảo chúng mình cứ thong thả làm."
  },
  {
    "id": 64,
    "start": 337.25,
    "end": 344.5,
    "text": "Okay, ich fang dann mal an! Was macht das Auto, Mechaniker? Ich habe noch was angebaut, um das Auto ganz besonders schnell zu machen!",
    "vi": "Được rồi, vậy chị bắt đầu làm đây! Chiếc xe thế nào rồi hả bác thợ máy? Cháu vừa gắn thêm một bộ phận để làm cho xe chạy cực kỳ nhanh luôn đấy!"
  },
  {
    "id": 65,
    "start": 344.65,
    "end": 350.0,
    "text": "Oh wow, du bist ein guter Mechaniker! Danke! Alles klar! Ich mach dann das Knoblauchbrot!",
    "vi": "Ồ oa, em là một người thợ sửa xe giỏi đấy! Cảm ơn chị! Tất cả đã sẵn sàng! Chị sẽ đi làm bánh mì bơ tỏi đây!"
  },
  {
    "id": 66,
    "start": 350.35,
    "end": 357.8,
    "text": "Hey Mädels, der Akku ist aufgeladen. Ihr könnt wieder mit dem Auto fahren. Oh, danke. Du bist dann jetzt mit Fahren dran, Bluey. Ähm, ja... hast recht.",
    "vi": "Này các cô gái, pin đã được sạc đầy rồi đấy. Các con có thể lái xe trở lại rồi. Ồ, cảm ơn bố. Giờ đến lượt con lái xe rồi đấy, Bluey. Ừm, vâng... em nói đúng."
  },
  {
    "id": 67,
    "start": 357.85,
    "end": 365.2,
    "text": "Und den Schlüssel muss man nur in der Tasche haben. Man muss ihn nicht mal raus... Stripe, bitte hör auf, über dein Auto zu reden!",
    "vi": "Và chìa khóa thì chỉ cần để trong túi thôi. Thậm chí không cần phải rút ra... Stripe à, làm ơn đừng có nói mãi về chiếc xe của anh nữa!"
  },
  {
    "id": 68,
    "start": 365.35,
    "end": 372.0,
    "text": "Ihre Pizzen sind da! Ah, toll! Na ja, erstmal nur eine. Wie ist es in Italien? Äh, gut.",
    "vi": "Pizza của quý khách đến rồi đây ạ! A, tuyệt quá! À, tạm thời chỉ có một chiếc thôi. Ở Ý thế nào ạ? À, tốt lắm."
  },
  {
    "id": 69,
    "start": 372.05,
    "end": 378.5,
    "text": "Hier, bitte sehr! Guten Hunger! Äh... danke. Ich bin gleich wieder zurück! Ups!",
    "vi": "Đây, xin mời quý khách! Chúc ngon miệng nhé! À... cảm ơn cháu. Tôi sẽ quay lại ngay đây! Ôi thôi!"
  },
  {
    "id": 70,
    "start": 378.85,
    "end": 386.5,
    "text": "Oh weh! Vielleicht ist es wirklich an der Zeit für ein neues Auto, Bluey. Auf keinen Fall! Ich habe das Teil, seit ich 2 bin!",
    "vi": "Trời ơi! Có lẽ đã thực sự đến lúc phải mua một chiếc xe mới rồi, Bluey à. Không đời nào đâu! Cháu đã có chiếc xe này từ khi mới 2 tuổi rồi đấy!"
  },
  {
    "id": 71,
    "start": 386.85,
    "end": 395.0,
    "text": "Hallo, Mechaniker! Ich hab eine Panne! Komme! Hi, ich möchte Ihr Auto reparieren!",
    "vi": "Xin chào bác thợ máy! Xe của tôi bị hỏng rồi! Đến ngay đây! Chào quý khách, tôi muốn sửa xe giúp quý khách!"
  },
  {
    "id": 72,
    "start": 395.35,
    "end": 404.5,
    "text": "Du meine Güte, das ging ja schnell! Repariert! Nicht schlecht, oder? So gut wie neu!",
    "vi": "Trời đất ơi, nhanh thật đấy! Đã sửa xong rồi! Không tồi chút nào đúng không? Tốt như mới luôn!"
  }
];

let kinoCurrentIndex = 0;
let kinoPlaybackRate = 1.0;
let kinoShowSubtitles = true;
let kinoActiveLearnTab = 'diktat';
let kinoCompletedSet = new Set();
let kinoDubbingRecorder = null;
let kinoDubbingAudioChunks = [];
let kinoDubbingBlobUrl = null;
let kinoIsDubbing = false;
let kinoTimeupdateListener = null;

function loadKinoProgress(){
  try {
    const saved = localStorage.getItem('vokabelgo_kino_pizzaschwester_done');
    if(saved){
      const arr = JSON.parse(saved);
      kinoCompletedSet = new Set(arr);
    }
  }catch(e){}
}

function saveKinoProgress(){
  try {
    localStorage.setItem('vokabelgo_kino_pizzaschwester_done', JSON.stringify([...kinoCompletedSet]));
  }catch(e){}
}

function initKinoV2(){
  loadKinoProgress();
  const video = document.getElementById('kinoMainVideo');
  if(video && (!video.src || !video.src.includes('pizzaschwester.mp4'))){
    video.src = 'video/pizzaschwester.mp4';
  }
  renderKinoTimelineList();
  loadKinoSentence(kinoCurrentIndex);
  bindKinoEvents();
}

function bindKinoEvents(){
  const playBtn = document.getElementById('kinoPlayLoopBtn');
  if(playBtn) playBtn.onclick = () => playKinoCurrentSegment();

  const prevBtn = document.getElementById('kinoPrevBtn');
  if(prevBtn) prevBtn.onclick = () => prevKinoSentence();

  const nextBtn = document.getElementById('kinoNextBtn');
  if(nextBtn) nextBtn.onclick = () => nextKinoSentence();

  const speedBtn = document.getElementById('kinoSpeedBtn');
  if(speedBtn) speedBtn.onclick = () => toggleKinoSpeed();

  const subBtn = document.getElementById('kinoToggleSubBtn');
  if(subBtn) subBtn.onclick = () => toggleKinoSubtitles();

  const textarea = document.getElementById('kinoDiktatInput');
  if(textarea){
    textarea.onkeydown = (e) => {
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        checkKinoDiktat();
      }
    };
  }

  // Keyboard shortcut listener (Space for replay, Arrows for nav)
  document.addEventListener('keydown', (e) => {
    const diktatModeEl = document.getElementById('diktatMode');
    if(!diktatModeEl || diktatModeEl.classList.contains('hidden')) return;
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if(tag === 'input' || tag === 'textarea') return;

    if(e.code === 'Space'){
      e.preventDefault();
      playKinoCurrentSegment();
    } else if(e.code === 'ArrowLeft'){
      e.preventDefault();
      prevKinoSentence();
    } else if(e.code === 'ArrowRight'){
      e.preventDefault();
      nextKinoSentence();
    }
  });
}

function loadKinoSentence(idx){
  if(idx < 0) idx = 0;
  if(idx >= PIZZASCHWESTER_72_SEGMENTS.length) idx = PIZZASCHWESTER_72_SEGMENTS.length - 1;
  kinoCurrentIndex = idx;
  const seg = PIZZASCHWESTER_72_SEGMENTS[idx];

  // Update Counters & Progress
  const total = PIZZASCHWESTER_72_SEGMENTS.length;
  document.getElementById('kinoProgressText').textContent = `Câu ${idx + 1} / ${total}`;
  document.getElementById('kinoDoneCount').textContent = `✅ Đã thuộc: ${kinoCompletedSet.size} / ${total} câu`;
  const pct = Math.round(((idx + 1) / total) * 100);
  document.getElementById('kinoProgressFill').style.width = `${pct}%`;

  // Update Sentence info & sub
  const dur = (seg.end - seg.start).toFixed(1);
  const startStr = formatKinoSeconds(seg.start);
  const endStr = formatKinoSeconds(seg.end);
  document.getElementById('kinoTimeTag').textContent = `⏱️ ${startStr} ➔ ${endStr} (${dur}s)`;

  document.getElementById('kinoOverlayDe').textContent = seg.text;
  document.getElementById('kinoOverlayVi').textContent = seg.vi;

  document.getElementById('kinoDubTargetDe').textContent = seg.text;
  document.getElementById('kinoDubTargetVi').textContent = seg.vi;

  // Reset Diktat Input & Feedback
  const input = document.getElementById('kinoDiktatInput');
  if(input) input.value = '';
  const fb = document.getElementById('kinoFeedbackBox');
  if(fb) fb.classList.add('hidden');

  // Reset Dubbing Result state
  const dubResults = document.getElementById('kinoDubResultActions');
  if(dubResults) dubResults.classList.add('hidden');
  document.getElementById('kinoDubStatus').textContent = 'Nhấn nút Micro phía trên để bắt đầu lồng tiếng!';

  // Seek video to start
  const video = document.getElementById('kinoMainVideo');
  if(video){
    video.pause();
    video.currentTime = seg.start;
  }

  // Update active item in timeline
  updateActiveTimelineItem(idx);
}

function formatKinoSeconds(sec){
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(4, '0');
  return `${mStr}:${sStr}`;
}

function playKinoCurrentSegment(rate){
  const video = document.getElementById('kinoMainVideo');
  if(!video) return;
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!seg) return;

  if(kinoTimeupdateListener){
    video.removeEventListener('timeupdate', kinoTimeupdateListener);
    kinoTimeupdateListener = null;
  }

  video.playbackRate = rate || kinoPlaybackRate;
  video.currentTime = seg.start;
  video.muted = false;

  const playPromise = video.play();
  if(playPromise !== undefined){
    playPromise.catch(e => console.log("Play interrupted or pending", e));
  }

  kinoTimeupdateListener = function(){
    if(video.currentTime >= seg.end){
      video.pause();
      video.removeEventListener('timeupdate', kinoTimeupdateListener);
      kinoTimeupdateListener = null;
    }
  };
  video.addEventListener('timeupdate', kinoTimeupdateListener);
}

function prevKinoSentence(){
  if(kinoCurrentIndex > 0){
    loadKinoSentence(kinoCurrentIndex - 1);
    playKinoCurrentSegment();
  }
}

function nextKinoSentence(){
  if(kinoCurrentIndex < PIZZASCHWESTER_72_SEGMENTS.length - 1){
    loadKinoSentence(kinoCurrentIndex + 1);
    playKinoCurrentSegment();
  }
}

function toggleKinoSpeed(){
  kinoPlaybackRate = (kinoPlaybackRate === 1.0) ? 0.8 : 1.0;
  const btn = document.getElementById('kinoSpeedBtn');
  if(btn){
    btn.innerHTML = `🐢 <span>${kinoPlaybackRate.toFixed(1)}x</span>`;
    btn.classList.toggle('active', kinoPlaybackRate < 1.0);
  }
  const video = document.getElementById('kinoMainVideo');
  if(video) video.playbackRate = kinoPlaybackRate;
}

function toggleKinoSubtitles(){
  kinoShowSubtitles = !kinoShowSubtitles;
  const overlay = document.getElementById('kinoSubOverlay');
  if(overlay) overlay.classList.toggle('hidden-sub', !kinoShowSubtitles);
  const btn = document.getElementById('kinoToggleSubBtn');
  if(btn) btn.classList.toggle('active', kinoShowSubtitles);
}

function switchKinoLearnTab(tab){
  kinoActiveLearnTab = tab;
  document.getElementById('tabBtnDiktat').classList.toggle('active', tab === 'diktat');
  document.getElementById('tabBtnDub').classList.toggle('active', tab === 'dub');
  document.getElementById('panelDiktat').classList.toggle('hidden', tab !== 'diktat');
  document.getElementById('panelDub').classList.toggle('hidden', tab !== 'dub');
}

// Normalize string for clean comparison (ignore punctuation, trim, lower)
function cleanKinoStr(s){
  return String(s || '').toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'…!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function checkKinoDiktat(){
  const input = document.getElementById('kinoDiktatInput');
  const userVal = input ? input.value.trim() : '';
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!seg) return;

  const cleanUser = cleanKinoStr(userVal);
  const cleanTarget = cleanKinoStr(seg.text);

  const fbBox = document.getElementById('kinoFeedbackBox');
  const fbStatus = document.getElementById('kinoFeedbackStatus');
  const fbDe = document.getElementById('kinoAnswerDe');
  const fbVi = document.getElementById('kinoAnswerVi');

  fbBox.classList.remove('hidden');
  fbDe.textContent = seg.text;
  fbVi.textContent = seg.vi;

  if(cleanUser === cleanTarget){
    fbStatus.textContent = '🎉 Tuyệt vời! Chính xác 100%!';
    fbStatus.className = 'kino-feedback-status correct';
    kinoCompletedSet.add(seg.id);
    saveKinoProgress();
    document.getElementById('kinoDoneCount').textContent = `✅ Đã thuộc: ${kinoCompletedSet.size} / ${PIZZASCHWESTER_72_SEGMENTS.length} câu`;
    updateActiveTimelineItem(kinoCurrentIndex);
  } else {
    fbStatus.textContent = '💡 Gần đúng rồi! Hãy đối chiếu câu mẫu bên dưới nhé:';
    fbStatus.className = 'kino-feedback-status partial';
  }
}

function giveKinoHint(){
  const input = document.getElementById('kinoDiktatInput');
  if(!input) return;
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!seg) return;

  const targetWords = seg.text.split(' ');
  const userWords = input.value.trim().split(' ').filter(w => w);

  if(userWords.length < targetWords.length){
    const nextWord = targetWords[userWords.length];
    input.value = (input.value.trim() + ' ' + nextWord).trim();
    input.focus();
  } else {
    input.value = seg.text;
  }
}

function revealKinoAnswer(){
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!seg) return;
  const fbBox = document.getElementById('kinoFeedbackBox');
  const fbStatus = document.getElementById('kinoFeedbackStatus');
  const fbDe = document.getElementById('kinoAnswerDe');
  const fbVi = document.getElementById('kinoAnswerVi');

  fbBox.classList.toggle('hidden');
  fbStatus.textContent = '📖 Đáp án câu thoại & Bản dịch:';
  fbStatus.className = 'kino-feedback-status';
  fbDe.textContent = seg.text;
  fbVi.textContent = seg.vi;
}

// --------------------------------------------------------------------------
// 🎙️ DUBBING / LỒNG TIẾNG 1-CLICK ENGINE
// --------------------------------------------------------------------------
async function toggleKinoDubbing(){
  if(kinoIsDubbing){
    stopKinoDubbing();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startKinoDubbing(stream);
  } catch(err){
    alert("Không thể mở Micro. Xin vui lòng cho phép quyền truy cập Micro trên trình duyệt để luyện lồng tiếng!");
    console.error("Mic error:", err);
  }
}

function startKinoDubbing(stream){
  const video = document.getElementById('kinoMainVideo');
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!video || !seg) return;

  kinoIsDubbing = true;
  kinoDubbingAudioChunks = [];
  kinoDubbingRecorder = new MediaRecorder(stream);

  kinoDubbingRecorder.ondataavailable = (e) => {
    if(e.data.size > 0) kinoDubbingAudioChunks.push(e.data);
  };

  kinoDubbingRecorder.onstop = () => {
    const blob = new Blob(kinoDubbingAudioChunks, { type: 'audio/webm' });
    if(kinoDubbingBlobUrl) URL.revokeObjectURL(kinoDubbingBlobUrl);
    kinoDubbingBlobUrl = URL.createObjectURL(blob);

    // Stop all mic tracks
    stream.getTracks().forEach(track => track.stop());

    // Update UI for replay
    document.getElementById('kinoDubResultActions').classList.remove('hidden');
    document.getElementById('kinoDubStatus').textContent = '✅ Đã lồng tiếng xong! Bấm "Nghe lại bạn lồng tiếng" để xem video kèm giọng của bạn!';
    
    // Auto trigger replay
    replayKinoDubbing();
  };

  // Update UI for recording
  const recBtn = document.getElementById('kinoDubRecordBtn');
  recBtn.classList.add('recording');
  document.getElementById('kinoDubBtnText').textContent = 'Đang ghi âm... Nhấn để dừng';
  document.getElementById('kinoRecordingHud').classList.remove('hidden');
  document.getElementById('kinoHudSub').textContent = `"${seg.text}"`;
  document.getElementById('kinoDubStatus').textContent = '🔴 Đang lồng tiếng! Hãy nhìn cử chỉ nhân vật và đọc theo câu thoại...';

  // Play video MUTED from start to end
  video.currentTime = seg.start;
  video.muted = true;
  video.playbackRate = 1.0;
  video.play();
  kinoDubbingRecorder.start();

  if(kinoTimeupdateListener){
    video.removeEventListener('timeupdate', kinoTimeupdateListener);
  }

  kinoTimeupdateListener = function(){
    if(video.currentTime >= seg.end){
      stopKinoDubbing();
    }
  };
  video.addEventListener('timeupdate', kinoTimeupdateListener);
}

function stopKinoDubbing(){
  kinoIsDubbing = false;
  const video = document.getElementById('kinoMainVideo');
  if(video){
    video.pause();
    if(kinoTimeupdateListener){
      video.removeEventListener('timeupdate', kinoTimeupdateListener);
      kinoTimeupdateListener = null;
    }
  }

  if(kinoDubbingRecorder && kinoDubbingRecorder.state !== 'inactive'){
    kinoDubbingRecorder.stop();
  }

  const recBtn = document.getElementById('kinoDubRecordBtn');
  if(recBtn) recBtn.classList.remove('recording');
  document.getElementById('kinoDubBtnText').textContent = 'Bắt đầu lồng tiếng';
  document.getElementById('kinoRecordingHud').classList.add('hidden');
}

function replayKinoDubbing(){
  if(!kinoDubbingBlobUrl) return;
  const video = document.getElementById('kinoMainVideo');
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!video || !seg) return;

  const userAudio = new Audio(kinoDubbingBlobUrl);
  video.currentTime = seg.start;
  video.muted = true; // Mute character, let user voice play
  video.playbackRate = 1.0;

  if(kinoTimeupdateListener){
    video.removeEventListener('timeupdate', kinoTimeupdateListener);
  }

  kinoTimeupdateListener = function(){
    if(video.currentTime >= seg.end){
      video.pause();
      userAudio.pause();
      video.removeEventListener('timeupdate', kinoTimeupdateListener);
      kinoTimeupdateListener = null;
    }
  };
  video.addEventListener('timeupdate', kinoTimeupdateListener);

  video.play();
  userAudio.play();
  document.getElementById('kinoDubStatus').textContent = '▶️ Đang phát lại video ghép với giọng lồng tiếng của bạn!';
}

// --------------------------------------------------------------------------
// 📜 TIMELINE LIST RENDERING & NAVIGATION
// --------------------------------------------------------------------------
function renderKinoTimelineList(){
  const container = document.getElementById('kinoTimelineList');
  if(!container) return;
  container.innerHTML = '';

  PIZZASCHWESTER_72_SEGMENTS.forEach((seg, idx) => {
    const item = document.createElement('div');
    item.className = `kino-timeline-item ${idx === kinoCurrentIndex ? 'active' : ''}`;
    item.id = `kinoItem_${idx}`;
    item.onclick = () => {
      loadKinoSentence(idx);
      playKinoCurrentSegment();
    };

    const startStr = formatKinoSeconds(seg.start);
    const isDone = kinoCompletedSet.has(seg.id);

    item.innerHTML = `
      <div class="kino-t-item-left">
        <span class="kino-t-num">#${String(idx + 1).padStart(2, '0')}</span>
        <span class="kino-t-time">${startStr}</span>
        <span class="kino-t-text" title="${seg.text}">${seg.text}</span>
      </div>
      <div class="kino-t-status" id="kinoStatus_${idx}">${isDone ? '✅' : '⚪'}</div>
    `;
    container.appendChild(item);
  });
  document.getElementById('kinoTimelineProgress').textContent = `(Đã hoàn thành: ${kinoCompletedSet.size} / ${PIZZASCHWESTER_72_SEGMENTS.length} câu)`;
}

function updateActiveTimelineItem(activeIdx){
  document.querySelectorAll('.kino-timeline-item').forEach((el, idx) => {
    el.classList.toggle('active', idx === activeIdx);
    const statusEl = document.getElementById(`kinoStatus_${idx}`);
    if(statusEl){
      const segId = PIZZASCHWESTER_72_SEGMENTS[idx].id;
      statusEl.textContent = kinoCompletedSet.has(segId) ? '✅' : '⚪';
    }
  });

  // Auto scroll active item into view
  const activeEl = document.getElementById(`kinoItem_${activeIdx}`);
  if(activeEl){
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function toggleKinoTimeline(){
  const body = document.getElementById('kinoTimelineBody');
  const btn = document.getElementById('kinoCollapseBtn');
  if(!body || !btn) return;
  const isHidden = body.classList.toggle('collapsed');
  btn.textContent = isHidden ? 'Mở rộng ▼' : 'Thu gọn ▲';
}
